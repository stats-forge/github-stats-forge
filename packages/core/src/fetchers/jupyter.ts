/**
 * @file Recounts a repository's Jupyter Notebook bytes as the languages its code cells are written
 * in, since GitHub counts a whole `.ipynb`, saved outputs included, as Jupyter Notebook.
 */

import type { CardConfig } from '../common/config.ts';
import { GITHUB_USERNAME_PATTERN } from '../common/constants.ts';
import { CardError } from '../common/error.ts';
import { httpRequest } from '../common/http.ts';
import type { FetcherContext } from '../common/http.ts';
import { linguistLanguage } from '../common/languageAliases.ts';
import { getLanguageColor } from '../common/languageColors.ts';
import { logger } from '../common/log.ts';
import { retryer } from '../common/retryer.ts';
import type { FetcherResponse } from '../common/retryer.ts';
import type { TopLanguageFragment } from '../graphql/generated/top-languages.ts';

/** What `notebooks` accepts: `github` keeps GitHub's count, `code` counts code cells by kernel. */
const NOTEBOOK_COUNTS = ['github', 'code'] as const;

/** The name GitHub Linguist gives `.ipynb` files. */
const JUPYTER_NOTEBOOK = 'Jupyter Notebook';

/** Notebooks one card reads; a repository past it keeps GitHub's count. */
const MAX_NOTEBOOKS_PER_CARD = 25;

/** Repositories whose notebooks one card lists, in the order GitHub returns them. */
const MAX_TREES_PER_CARD = 10;

/** A notebook larger than this is mostly saved output, so its repository keeps GitHub's count. */
const MAX_NOTEBOOK_BYTES = 2 * 1024 * 1024;

const REQUEST_CONCURRENCY = 5;

/** A repository name as GitHub spells it, never `.` or `..`, so it stays one path segment. */
const REPOSITORY_NAME_PATTERN = /^(?!\.+$)[\w.-]+$/;

const SHA_PATTERN = /^[\da-f]{40,64}$/;

/**
 * Kernel names Linguist does not know, keyed lower-case, to the Linguist name; every other name is
 * looked up in Linguist's own names, aliases and interpreters.
 */
const JUPYTER_KERNELS = new Map<string, string>([
  ['clojurescript', 'Clojure'],
  ['cxx', 'C++'],
  ['ipython', 'Python'],
  ['ir', 'R'],
]);

/** Cell magics whose body is text rather than code; Markdown and SVG are languages GitHub leaves out. */
const TEXT_MAGICS = new Set(['file', 'latex', 'writefile']);

type JsonObject = Record<string, unknown>;

/** `GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1`, as far as this reads it. */
interface GitTree {
  truncated?: boolean;
  tree?: Array<{ path?: string; sha?: string; size?: number; type?: string }>;
}

/** Code-cell bytes, keyed by Linguist name; an unknown kernel's stay under Jupyter Notebook. */
type LanguageBytes = Map<string, number>;

/** A repository's languages, as the top-languages query answers them. */
interface RepositoryLanguages {
  nameWithOwner: string;
  edges: Array<TopLanguageFragment>;
}

/** One repository's notebooks, and their code once read; `bytes` is unset once one fails. */
interface Recount {
  nameWithOwner: string;
  shas: Array<string>;
  bytes: LanguageBytes | undefined;
}

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** @returns The object under `key`, or an empty one when there is none. */
const objectAt = (value: JsonObject, key: string): JsonObject => {
  const found = value[key];
  if (!isObject(found)) {
    return {};
  }
  return found;
};

/** @returns The value as an array of unknowns, or `undefined` when it is not one. */
const asArray = (value: unknown): Array<unknown> | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value as Array<unknown>;
};

const addBytes = (bytes: LanguageBytes, language: string, size: number): void => {
  bytes.set(language, (bytes.get(language) ?? 0) + size);
};

/**
 * @returns The Linguist name a kernel, language id or cell magic stands for; `null` for a language
 * GitHub's bar leaves out, `undefined` for one this does not know.
 */
const kernelLanguage = (name: unknown): string | null | undefined => {
  if (typeof name !== 'string') {
    return undefined;
  }
  const key = name.trim().toLowerCase();
  const known = JUPYTER_KERNELS.get(key) ?? linguistLanguage(key);
  if (known !== undefined) {
    return known;
  }
  if (/^python\d/.test(key)) {
    return 'Python';
  }
  if (/^julia[\d.-]/.test(key)) {
    return 'Julia';
  }
  return undefined;
};

/** @returns A cell's source, which nbformat stores as one string or as lines to concatenate. */
const sourceText = (cell: JsonObject): string => {
  // nbformat 3 kept a code cell's source under `input`
  const source = cell['source'] ?? cell['input'];
  if (typeof source === 'string') {
    return source;
  }
  return (asArray(source) ?? []).filter((line) => typeof line === 'string').join('');
};

/** @returns The cells, from the top level or, in nbformat 3, from every worksheet. */
const notebookCells = (notebook: JsonObject): Array<unknown> | undefined => {
  const cells = asArray(notebook['cells']);
  if (cells !== undefined) {
    return cells;
  }
  return asArray(notebook['worksheets'])
    ?.filter((sheet) => isObject(sheet))
    .flatMap((sheet) => asArray(sheet['cells']) ?? []);
};

/** @returns The notebook's kernel language, or Jupyter Notebook when it names none this knows. */
const notebookLanguage = (notebook: JsonObject): string => {
  const metadata = objectAt(notebook, 'metadata');
  const kernelspec = objectAt(metadata, 'kernelspec');
  return (
    kernelLanguage(objectAt(metadata, 'language_info')['name']) ??
    kernelLanguage(kernelspec['language']) ??
    kernelLanguage(kernelspec['name']) ??
    JUPYTER_NOTEBOOK
  );
};

/**
 * @returns The language a leading `%%magic`, a VS Code language id or an nbformat 3 cell names,
 * else `fallback`; `undefined` for a magic whose body is text, or a language GitHub's bar leaves out.
 */
const cellLanguage = (cell: JsonObject, source: string, fallback: string): string | undefined => {
  const magic = /^%%(?<name>[\w#+]+)/.exec(source.trimStart())?.groups?.['name'];
  if (magic !== undefined && TEXT_MAGICS.has(magic.toLowerCase())) {
    return undefined;
  }
  const vscode = objectAt(objectAt(cell, 'metadata'), 'vscode');
  const named = [magic, vscode['languageId'], cell['language']]
    .map((name) => kernelLanguage(name))
    .find((language) => language !== undefined);
  if (named === undefined) {
    return fallback;
  }
  if (named === null) {
    return undefined;
  }
  return named;
};

/**
 * Count the UTF-8 bytes of a notebook's code cells by the language each is written in.
 * Markdown cells and outputs count for nothing.
 *
 * @returns Bytes keyed by Linguist name, or `undefined` when the value is not a notebook.
 */
const notebookCodeBytes = (notebook: unknown): LanguageBytes | undefined => {
  if (!isObject(notebook)) {
    return undefined;
  }
  const cells = notebookCells(notebook);
  if (cells === undefined) {
    return undefined;
  }

  const fallback = notebookLanguage(notebook);
  const encoder = new TextEncoder();
  const bytes: LanguageBytes = new Map();
  for (const cell of cells) {
    if (isObject(cell) && cell['cell_type'] === 'code') {
      const source = sourceText(cell);
      const size = encoder.encode(source).byteLength;
      const language = cellLanguage(cell, source, fallback);
      if (size > 0 && language !== undefined) {
        addBytes(bytes, language, size);
      }
    }
  }
  return bytes;
};

const headers = (token: string, accept: string): HeadersInit => ({
  Accept: accept,
  Authorization: `token ${token}`,
});

const fetchTree = (
  { nameWithOwner }: { nameWithOwner: string },
  token: string,
  { fetch }: FetcherContext,
): Promise<FetcherResponse<GitTree>> =>
  httpRequest(fetch, `https://api.github.com/repos/${nameWithOwner}/git/trees/HEAD?recursive=1`, {
    headers: headers(token, 'application/vnd.github+json'),
  });

/** The raw media type answers with the notebook itself, which is JSON, rather than base64. */
const fetchBlob = (
  { nameWithOwner, sha }: { nameWithOwner: string; sha: string },
  token: string,
  { fetch }: FetcherContext,
): Promise<FetcherResponse> =>
  httpRequest(fetch, `https://api.github.com/repos/${nameWithOwner}/git/blobs/${sha}`, {
    headers: headers(token, 'application/vnd.github.raw+json'),
  });

/** @returns The results, in order, with at most {@link REQUEST_CONCURRENCY} requests in flight. */
const inPool = async <T, R>(
  items: ReadonlyArray<T>,
  read: (item: T) => Promise<R>,
): Promise<Array<R>> => {
  const results: Array<R> = [];
  // shared, so each worker takes the next item as soon as it is free
  const queue = items.entries();
  // once one fails the caller has its answer, so the others stop taking items
  let failed = false;
  const worker = async (): Promise<void> => {
    for (const [index, item] of queue) {
      if (failed) {
        return;
      }
      results[index] = await read(item);
    }
  };
  await Promise.all(
    Array.from({ length: REQUEST_CONCURRENCY }, () =>
      worker().catch((error: unknown) => {
        failed = true;
        throw error;
      }),
    ),
  );
  return results;
};

/** @returns Whether it is `owner/name` as GitHub spells both; anything else never reaches a URL. */
const isNameWithOwner = (nameWithOwner: string): boolean => {
  const [owner = '', name = '', ...rest] = nameWithOwner.split('/');
  return (
    rest.length === 0 && GITHUB_USERNAME_PATTERN.test(owner) && REPOSITORY_NAME_PATTERN.test(name)
  );
};

/**
 * A recount is a refinement, so a request that fails keeps GitHub's count rather than failing the
 * card; anything else, such as the host's timeout, goes on up as it would from any request.
 *
 * @returns A `catch` handler resolving to `undefined`, for the repository to keep GitHub's count.
 */
const keepGitHubsCount =
  (nameWithOwner: string) =>
  (error: unknown): undefined => {
    if (!(error instanceof CardError)) {
      throw error;
    }
    logger.log(`Kept GitHub's count for ${nameWithOwner}'s notebooks:`, error);
    return undefined;
  };

/** @returns The repository's notebooks to read, or `undefined` when it keeps GitHub's count. */
const listNotebooks = async (
  nameWithOwner: string,
  /** GitHub's Jupyter Notebook bytes, which the notebooks in the tree must add up to. */
  jupyterBytes: number,
  config: CardConfig,
): Promise<Recount | undefined> => {
  const { status, data } = await retryer(fetchTree, { nameWithOwner }, config);
  if (status !== 200 || data.truncated === true || !Array.isArray(data.tree)) {
    return undefined;
  }

  const shas: Array<string> = [];
  let notebookBytes = 0;
  let checkpointBytes = 0;
  // read as untrusted, so an odd answer keeps GitHub's count rather than failing the card
  const entries: Array<unknown> = data.tree;
  for (const entry of entries) {
    if (!isObject(entry)) {
      return undefined;
    }
    const { path, sha, size, type } = entry;
    if (
      type === 'blob' &&
      typeof path === 'string' &&
      path.endsWith('.ipynb') &&
      typeof size === 'number'
    ) {
      if (path.split('/').includes('.ipynb_checkpoints')) {
        // a checkpoint repeats its notebook, and would count it twice
        checkpointBytes += size;
      } else if (typeof sha === 'string' && SHA_PATTERN.test(sha) && size <= MAX_NOTEBOOK_BYTES) {
        shas.push(sha);
        notebookBytes += size;
      } else {
        return undefined;
      }
    }
  }

  // otherwise GitHub skipped a notebook (vendored, documentation, `.gitattributes`) this can't tell
  const countsWhatGitHubCounted =
    jupyterBytes === notebookBytes || jupyterBytes === notebookBytes + checkpointBytes;
  if (shas.length === 0 || !countsWhatGitHubCounted) {
    return undefined;
  }
  return { nameWithOwner, shas, bytes: new Map() };
};

/** @returns The notebook's code bytes, or `undefined` when it cannot be read as one. */
const readNotebook = async (
  nameWithOwner: string,
  sha: string,
  config: CardConfig,
): Promise<LanguageBytes | undefined> => {
  const { status, data } = await retryer(fetchBlob, { nameWithOwner, sha }, config);
  if (status !== 200) {
    return undefined;
  }
  return notebookCodeBytes(data);
};

/** @returns The edges, Jupyter Notebook's outputs gone and its code added where it belongs. */
const withCodeCells = (
  edges: Array<TopLanguageFragment>,
  bytes: LanguageBytes,
): Array<TopLanguageFragment> => {
  // an unknown kernel's code stays Jupyter Notebook, in the color GitHub gave it
  const jupyterColor = edges.find(({ node }) => node.name === JUPYTER_NOTEBOOK)?.node.color ?? null;
  const merged = edges
    .filter(({ node }) => node.name !== JUPYTER_NOTEBOOK)
    .map((edge) => ({ ...edge, size: edge.size + (bytes.get(edge.node.name) ?? 0) }));
  for (const [name, size] of bytes) {
    if (!merged.some(({ node }) => node.name === name)) {
      const color = name === JUPYTER_NOTEBOOK ? jupyterColor : getLanguageColor(name);
      merged.push({ size, node: { name, color } });
    }
  }
  return merged;
};

/**
 * Swap each repository's Jupyter Notebook edge for the bytes its code cells hold, by language.
 * All or nothing per repository: one it cannot read in full keeps GitHub's count.
 *
 * @returns The repositories, in order, with their notebooks recounted where they could be.
 */
const withNotebooksRecounted = async (
  repositories: Array<RepositoryLanguages>,
  config: CardConfig,
): Promise<Array<RepositoryLanguages>> => {
  const candidates = repositories
    .flatMap(({ nameWithOwner, edges }) => {
      const jupyter = edges.find(({ node }) => node.name === JUPYTER_NOTEBOOK);
      if (jupyter === undefined || !isNameWithOwner(nameWithOwner)) {
        return [];
      }
      return [{ nameWithOwner, jupyterBytes: jupyter.size }];
    })
    .slice(0, MAX_TREES_PER_CARD);
  const listed = await inPool(candidates, ({ nameWithOwner, jupyterBytes }) =>
    listNotebooks(nameWithOwner, jupyterBytes, config).catch(keepGitHubsCount(nameWithOwner)),
  );

  // spent before downloading, so a repository that then fails still costs what it read
  let budget = MAX_NOTEBOOKS_PER_CARD;
  const recounts: Array<Recount> = [];
  for (const recount of listed) {
    if (recount !== undefined && recount.shas.length <= budget) {
      budget -= recount.shas.length;
      recounts.push(recount);
    }
  }

  await inPool(
    recounts.flatMap((recount) => recount.shas.map((sha) => ({ recount, sha }))),
    async ({ recount, sha }) => {
      const { nameWithOwner, bytes: total } = recount;
      // one notebook failed, so the rest of the repository is not worth reading
      if (total === undefined) {
        return;
      }
      const bytes = await readNotebook(nameWithOwner, sha, config).catch(
        keepGitHubsCount(nameWithOwner),
      );
      if (bytes === undefined) {
        recount.bytes = undefined;
        return;
      }
      for (const [language, size] of bytes) {
        addBytes(total, language, size);
      }
    },
  );

  const recounted = new Map(recounts.map(({ nameWithOwner, bytes }) => [nameWithOwner, bytes]));
  return repositories.map((repository) => {
    const bytes = recounted.get(repository.nameWithOwner);
    if (bytes === undefined) {
      return repository;
    }
    return { ...repository, edges: withCodeCells(repository.edges, bytes) };
  });
};

export { NOTEBOOK_COUNTS, MAX_NOTEBOOKS_PER_CARD, MAX_TREES_PER_CARD, withNotebooksRecounted };
export type { GitTree };
