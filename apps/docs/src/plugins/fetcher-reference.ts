import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { API, SignatureKind, SymbolFlags } from 'typescript/unstable/sync';
import type { Checker, Symbol as TsSymbol } from 'typescript/unstable/sync';

/**
 * @file What each fetcher's page says about it, read from the fetcher's own doc comment.
 *
 * Nothing is written to disk: the reference exists only in the built page, so it cannot be stale.
 * Opening core's project costs about 110ms and every fetcher is then read in single-digit
 * milliseconds, so it happens once per build behind the cache below.
 *
 * This rides `typescript/unstable/sync`, which is unstable by name. When a TypeScript release
 * moves it, the docs build is what fails.
 */

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const CORE_CONFIG = resolve(REPO_ROOT, 'packages/core/tsconfig.json');
/** The sources every reference is read from. */
const FETCHERS_DIR = resolve(REPO_ROOT, 'packages/core/src/fetchers');
const ENTRY = join(FETCHERS_DIR, 'index.ts');
const PAGES_DIR = fileURLToPath(new URL('../content/docs/docs/fetchers/', import.meta.url));

/** One option a fetcher takes. */
interface Option {
  name: string;
  type: string;
  optional: boolean;
  doc: string;
}

/** A fetcher, as its page describes it. */
export interface Fetcher {
  name: string;
  summary: string;
  options: Array<Option>;
  returnType: string;
  returns: string;
}

/**
 * `SymbolFlags` is a bit set, and reading one is what this says.
 *
 * @returns Whether the flag is set.
 */
// oxlint-disable-next-line no-bitwise -- reading a bit set is the point of this function
const hasFlag = (flags: number, flag: number): boolean => (flags & flag) !== 0;

/** The page a fetcher is documented on, by the file name it takes. */
const pageFor = (name: string): string =>
  `${name.replaceAll(/(?<!^)(?<upper>[A-Z])/g, '-$<upper>').toLowerCase()}.md`;

/**
 * Reads one fetcher off the checker.
 *
 * @returns What its page needs to describe it.
 */
const read = (checker: Checker, exported: TsSymbol): Fetcher => {
  // The entry point re-exports, so the doc comment hangs off the aliased symbol.
  const symbol = checker.getAliasedSymbol(exported);
  const type = checker.getTypeOfSymbol(symbol);
  const [signature] =
    type === undefined ? [] : checker.getSignaturesOfType(type, SignatureKind.Call);
  if (!signature) {
    throw new Error(`${exported.name} is exported but is not callable`);
  }

  /** @returns How the page prints a type, or `unknown` when the checker has none. */
  const typeOf = (of: TsSymbol): string => {
    const resolved = checker.getTypeOfSymbol(of);
    return resolved === undefined ? 'unknown' : checker.typeToString(resolved);
  };

  // A destructured parameter carries no names, so the options are its type's properties —
  // which is also where the `/** */` on each declaration ends up.
  const optionsType = checker.getParameterType(signature, 0);
  const options = (optionsType === undefined ? [] : checker.getPropertiesOfType(optionsType)).map(
    (property): Option => ({
      name: property.name,
      type: typeOf(property),
      optional: hasFlag(property.flags, SymbolFlags.Optional),
      doc: property.getDocumentationComment(checker),
    }),
  );

  const returnType = checker.getReturnTypeOfSignature(signature);

  return {
    name: exported.name,
    summary: symbol.getDocumentationComment(checker),
    options,
    returnType: returnType === undefined ? 'unknown' : checker.typeToString(returnType),
    returns:
      symbol
        .getJsDocTags(checker)
        .find((tag) => tag.name === 'returns')
        ?.text?.trim() ?? '',
  };
};

/**
 * Every fetcher core exports, read in one pass.
 *
 * @throws {Error} When a fetcher has no page, so a new one is documented rather than dropped.
 *
 * @returns Each fetcher, keyed by name.
 */
const readAll = (): Map<string, Fetcher> => {
  const api = new API({ cwd: REPO_ROOT });
  try {
    const snapshot = api.updateSnapshot({ openProjects: [CORE_CONFIG] });
    const [project] = snapshot.getProjects();
    if (!project) {
      throw new Error(`No project opened for ${CORE_CONFIG}`);
    }

    const { program, checker } = project;
    const entry = program.getSourceFile(ENTRY);
    if (!entry) {
      throw new Error(`${ENTRY} is not part of the project`);
    }
    const moduleSymbol = checker.getSymbolAtLocation(entry);
    if (!moduleSymbol) {
      throw new Error(`${ENTRY} has no module symbol`);
    }

    const fetchers = checker
      .getExportsOfModule(moduleSymbol)
      .filter((exported) => exported.name.startsWith('fetch'))
      .map((exported) => read(checker, exported));

    const pages = new Set(readdirSync(PAGES_DIR));
    const undocumented = fetchers.filter((fetcher) => !pages.has(pageFor(fetcher.name)));
    if (undocumented.length > 0) {
      throw new Error(
        `Exported from core with no page: ${undocumented.map((fetcher) => fetcher.name).join(', ')}. ` +
          `Write ${undocumented.map((fetcher) => `src/content/docs/docs/fetchers/${pageFor(fetcher.name)}`).join(', ')}, ` +
          'with `<!-- api: <fetcher> -->` where the reference goes.',
      );
    }

    return new Map(fetchers.map((fetcher) => [fetcher.name, fetcher]));
  } finally {
    api.close();
  }
};

/**
 * The newest edit among the sources the reference is read from.
 * Keying the cache on it means a build opens core's project once, and a page that Astro does
 * re-render reads current doc comments rather than the ones this process started with.
 *
 * @returns The most recent modification time, in milliseconds.
 */
const sourcesChangedAt = (): number =>
  Math.max(
    ...readdirSync(FETCHERS_DIR)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => statSync(join(FETCHERS_DIR, file)).mtimeMs),
  );

let cache: { at: number; fetchers: Map<string, Fetcher> } | undefined;

/**
 * @throws {Error} When core no longer parses, or a fetcher has no page.
 *
 * @returns Every fetcher, re-read only when one of their files has changed.
 */
export const fetchers = (): Map<string, Fetcher> => {
  const at = sourcesChangedAt();
  if (cache?.at !== at) {
    cache = { at, fetchers: readAll() };
  }
  return cache.fetchers;
};
