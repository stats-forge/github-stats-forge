import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CardKind } from '@stats-forge/github-stats-forge-catalog';
import { cards, findCard } from '@stats-forge/github-stats-forge-catalog';
import type { ApiResult } from '@stats-forge/github-stats-forge-core/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

import type {
  askRequired,
  askSavePath,
  askToken,
  MenuChoice,
  navigateOptions,
  pickCard,
} from '../src/prompts.ts';
import { readSavedCard, writeSavedCard } from '../src/saved-card.ts';

const { render, prompts } = vi.hoisted(() => ({
  render: vi.fn<CardKind['render']>(),
  prompts: {
    pickCard: vi.fn<typeof pickCard>(),
    askRequired: vi.fn<typeof askRequired>(),
    askSavePath: vi.fn<typeof askSavePath>(),
    askToken: vi.fn<typeof askToken>(),
    navigateOptions: vi.fn<typeof navigateOptions>(),
  },
}));

// core's own specs cover rendering; here a card only has to answer
vi.mock(import('@stats-forge/github-stats-forge-catalog'), async (importOriginal) => {
  const original = await importOriginal();
  const mocked = original.cards.map((card) => ({ ...card, render }));
  return {
    ...original,
    cards: mocked,
    findCard: (id: string): CardKind | undefined => mocked.find((card) => card.id === id),
  };
});

vi.mock(import('../src/prompts.ts'), () => prompts);

const DRAWN: ApiResult = { status: 'success', content: '<svg>the card</svg>' };
const REFUSED: ApiResult = {
  status: 'error',
  retryable: false,
  error: {
    code: 'not_found',
    reason: 'gist_not_found',
    message: 'Gist not found',
    secondaryMessage: 'Check the id',
    text: 'Gist not found. Check the id.',
    param: undefined,
  },
  content: '<svg>the error</svg>',
};
const RATE_LIMITED: ApiResult = {
  status: 'error',
  retryable: true,
  error: {
    code: 'rate_limited',
    reason: 'rate_limited',
    message: 'Every token has hit the rate limit',
    secondaryMessage: undefined,
    text: 'Every token has hit the rate limit.',
    param: undefined,
  },
  content: '<svg>the error</svg>',
};

let dir: string;
/** A gist card saved with `id=abc&theme=ember_dark`. */
let savedGist: string;
let stdout: MockInstance<typeof process.stdout.write>;
let stderr: MockInstance<typeof process.stderr.write>;
let argv: Array<string>;
/** `process.stdin`'s own `isTTY`, which a piped stdin lacks. */
let stdinTTY: PropertyDescriptor | undefined;

/**
 * Runs the CLI once, as `github-stats-forge <args>`, against an empty env file.
 *
 * @returns What it printed to each stream, and the exit code it left.
 */
const run = async (
  ...args: Array<string>
): Promise<{ out: string; err: string; code: typeof process.exitCode }> => {
  process.argv = ['node', 'github-stats-forge', '--env-file', join(dir, 'empty.env'), ...args];
  // the entry runs on import, so each run needs a fresh copy
  vi.resetModules();
  await import('../src/index.ts');
  return {
    out: stdout.mock.calls.map(([chunk]) => String(chunk)).join(''),
    err: stderr.mock.calls.map(([chunk]) => String(chunk)).join(''),
    code: process.exitCode,
  };
};

/** Answers the CLI's "is this a terminal" check. */
const setTTY = (isTTY: boolean): void => {
  Object.defineProperty(process.stdin, 'isTTY', { value: isTTY, configurable: true });
};

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cli-entry-'));
  await writeFile(join(dir, 'empty.env'), '');
  savedGist = join(dir, 'gist.json');
  const gist = findCard('gist');
  if (!gist) {
    throw new Error('the catalog has a gist card');
  }
  await writeSavedCard(savedGist, gist, { id: 'abc', theme: 'ember_dark' });

  ({ argv } = process);
  // a token in the shell running the suite must not reach a test that expects none
  for (const name of Object.keys(process.env).filter((key) => /^PAT_\d+$/u.test(key))) {
    vi.stubEnv(name, undefined);
  }
  stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  stdinTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  setTTY(false);
});

afterEach(async () => {
  process.argv = argv;
  process.exitCode = undefined;
  if (stdinTTY) {
    Object.defineProperty(process.stdin, 'isTTY', stdinTTY);
  } else {
    Reflect.deleteProperty(process.stdin, 'isTTY');
  }
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

/** Makes the menu answer `choices`, in order, then quit. */
const choose = (...choices: Array<MenuChoice>): void => {
  for (const choice of [...choices, 'quit' as const]) {
    prompts.navigateOptions.mockResolvedValueOnce(choice);
  }
};

/** @returns The status line the menu was opened with each time. */
const statuses = (): Array<string | undefined> =>
  prompts.navigateOptions.mock.calls.map((call) => call[2]);

describe('the command line', () => {
  it('prints the usage, naming every card', async () => {
    const { out } = await run('--help');

    expect(out).toContain('Usage');
    for (const card of cards) {
      expect(out).toContain(card.id);
    }
    expect(render).not.toHaveBeenCalled();
  });

  it('prints its own version', async () => {
    const { version } = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version: string };

    const { out } = await run('--version');

    expect(out).toBe(`${version}\n`);
  });

  it('prints a saved card refined by --options, with no token and no terminal', async () => {
    const { out, code } = await run(
      '--config',
      savedGist,
      '--options',
      'theme=magma_dark&show_owner=true',
      '--print-query',
    );

    expect(out).toBe('?id=abc&theme=magma_dark&show_owner=true\n');
    expect(code).toBeUndefined();
    expect(render).not.toHaveBeenCalled();
  });

  it.each([
    { args: ['--generate'], says: '--generate renders a saved card' },
    { args: ['--check'], says: '--check renders a saved card' },
    { args: [], says: 'it needs a terminal' },
    { args: ['--card', 'nope', '--print-query'], says: 'No card called "nope"' },
    {
      args: ['--card', 'stats', '--print-query'],
      config: true,
      says: 'but --card asked for stats',
    },
    { args: ['--generate'], config: true, says: 'so it needs a token' },
  ])('refuses $args, saying "$says"', async ({ args, config, says }) => {
    const { err, code } = await run(...(config ? ['--config', savedGist] : []), ...args);

    expect(err).toContain(says);
    expect(code).toBe(1);
    expect(render).not.toHaveBeenCalled();
  });

  it('renders a saved card to --out and stops', async () => {
    render.mockResolvedValue(DRAWN);
    const out = join(dir, 'card.svg');

    const result = await run('--config', savedGist, '--generate', '--pat', 'ghp_x', '--out', out);

    await expect(readFile(out, 'utf8')).resolves.toBe('<svg>the card</svg>');
    expect(result.out).toContain('Wrote ');
    expect(result.code).toBeUndefined();
    const [query, config] = render.mock.calls[0] ?? [];
    expect(query).toStrictEqual({ id: 'abc', theme: 'ember_dark' });
    expect(config?.pats).toStrictEqual([{ name: '--pat #1', value: 'ghp_x' }]);
    expect(config?.requestTimeoutMs).toBe(30_000);
    // stdout carries the result alone, so core's diagnostics go to stderr
    config?.logger.log('PAT_1 Failed due to rate limiting');
    expect(stderr).toHaveBeenLastCalledWith('PAT_1 Failed due to rate limiting\n');
    // core's own advice assumes no host, so the CLI names where its token comes from
    expect(config?.hints.tokens_missing).toBe(
      `Pass --pat, or put PAT_1 in the environment or ${join(dir, 'empty.env')}`,
    );
    expect(prompts.navigateOptions).not.toHaveBeenCalled();
  });

  it('reports a render that failed, writes nothing, and exits 1', async () => {
    render.mockResolvedValue(REFUSED);
    const out = join(dir, 'card.svg');

    const result = await run('--config', savedGist, '--generate', '--pat', 'ghp_x', '--out', out);

    expect(result.err).toContain('Could not render the gist card.');
    expect(result.err).toContain('\n  Gist not found. Check the id.\n');
    expect(result.err).toContain('code: not_found');
    expect(result.err).not.toContain('retry');
    expect(result.code).toBe(1);
    expect(existsSync(out)).toBe(false);
  });

  it('exits 75 when the failure may pass on a retry, as a rate limit may', async () => {
    render.mockResolvedValue(RATE_LIMITED);
    const out = join(dir, 'card.svg');

    const result = await run('--config', savedGist, '--generate', '--pat', 'ghp_x', '--out', out);

    expect(result.err).toContain('This one may work on a retry.');
    expect(result.code).toBe(75);
    expect(existsSync(out)).toBe(false);
  });

  describe('--check', () => {
    it('passes when the file holds exactly this render, and leaves it alone', async () => {
      render.mockResolvedValue(DRAWN);
      const out = join(dir, 'card.svg');
      await writeFile(out, DRAWN.content);

      const result = await run('--config', savedGist, '--check', '--pat', 'ghp_x', '--out', out);

      expect(result.out).toContain('is up to date');
      expect(result.code).toBeUndefined();
      expect(prompts.navigateOptions).not.toHaveBeenCalled();
    });

    it.each([
      { what: 'differs', held: '<svg>an older card</svg>', says: 'is out of date' },
      { what: 'is missing', held: undefined, says: 'does not exist' },
    ])('fails when the file $what, and writes nothing', async ({ held, says }) => {
      render.mockResolvedValue(DRAWN);
      const out = join(dir, 'card.svg');
      if (held !== undefined) {
        await writeFile(out, held);
      }

      const result = await run('--config', savedGist, '--check', '--pat', 'ghp_x', '--out', out);

      expect(result.err).toContain(says);
      expect(result.code).toBe(1);
      expect(existsSync(out) ? await readFile(out, 'utf8') : undefined).toBe(held);
    });

    it('fails when the card cannot be rendered', async () => {
      render.mockResolvedValue(REFUSED);
      const out = join(dir, 'card.svg');
      await writeFile(out, DRAWN.content);

      const result = await run('--config', savedGist, '--check', '--pat', 'ghp_x', '--out', out);

      expect(result.err).toContain('Could not render the gist card.');
      expect(result.code).toBe(1);
    });

    it('exits 75 when the render may pass on a retry', async () => {
      render.mockResolvedValue(RATE_LIMITED);
      const out = join(dir, 'card.svg');
      await writeFile(out, DRAWN.content);

      const result = await run('--config', savedGist, '--check', '--pat', 'ghp_x', '--out', out);

      expect(result.code).toBe(75);
    });
  });

  it('leaves with 130, and says nothing, when a prompt is cancelled', async () => {
    setTTY(true);
    prompts.pickCard.mockRejectedValue(
      Object.assign(new Error('User force closed the prompt'), { name: 'ExitPromptError' }),
    );

    const { err, code } = await run();

    expect(code).toBe(130);
    expect(err).toBe('');
  });
});

describe('the menu', () => {
  beforeEach(() => {
    setTTY(true);
    prompts.askRequired.mockResolvedValue(new Map([['id', 'abc']]));
  });

  it('asks for a token when none was given, and stops without one', async () => {
    prompts.askToken.mockResolvedValue(undefined);

    const { err, code } = await run('--card', 'gist');

    expect(err).toContain('so it needs a token');
    expect(code).toBe(1);
  });

  it('uses the token it asked for', async () => {
    prompts.askToken.mockResolvedValue('ghp_typed');
    render.mockResolvedValue(DRAWN);
    choose('generate');

    await run('--card', 'gist', '--out', join(dir, 'card.svg'));

    expect(render.mock.calls[0]?.[1].pats).toStrictEqual([
      { name: 'The token you typed', value: 'ghp_typed' },
    ]);
  });

  it('prints, saves and generates, staying open until it is quit', async () => {
    render.mockResolvedValue(DRAWN);
    const config = join(dir, 'new.json');
    const out = join(dir, 'card.svg');
    choose('print', 'save', 'generate');

    const result = await run('--card', 'gist', '--pat', 'ghp_x', '--config', config, '--out', out);

    expect(result.out).toContain('?id=abc\n');
    await expect(readSavedCard(config)).resolves.toMatchObject({ options: { id: 'abc' } });
    await expect(readFile(out, 'utf8')).resolves.toBe('<svg>the card</svg>');
    expect(prompts.askSavePath).not.toHaveBeenCalled();
    expect(statuses()).toStrictEqual([
      undefined,
      expect.stringContaining('printed the query'),
      expect.stringContaining('saved '),
      expect.stringContaining('wrote '),
    ]);
    expect(result.code).toBeUndefined();
  });

  it('asks where to save when no --config said', async () => {
    const path = join(dir, 'asked.json');
    prompts.askSavePath.mockResolvedValue(path);
    choose('save');

    await run('--card', 'gist', '--pat', 'ghp_x');

    expect(prompts.askSavePath).toHaveBeenCalledWith('abc-gist-config.json');
    await expect(readSavedCard(path)).resolves.toMatchObject({ options: { id: 'abc' } });
  });

  it('seeds the required options from a saved card and --options', async () => {
    choose();

    await run('--config', savedGist, '--options', 'show_owner=true', '--pat', 'ghp_x');

    const [card, seeded] = prompts.askRequired.mock.calls[0] ?? [];
    expect(card?.id).toBe('gist');
    expect(Object.fromEntries(seeded ?? [])).toStrictEqual({
      id: 'abc',
      theme: 'ember_dark',
      show_owner: true,
    });
  });

  it('stays open after a failed render, and leaves with 1 if it was the last', async () => {
    render.mockResolvedValue(REFUSED);
    choose('generate');

    const { code } = await run('--card', 'gist', '--pat', 'ghp_x', '--out', join(dir, 'card.svg'));

    expect(statuses()[1]).toBe('not_found — fix it and generate again');
    expect(code).toBe(1);
  });

  it('leaves with 75 when the last render may pass on a retry', async () => {
    render.mockResolvedValue(RATE_LIMITED);
    choose('generate');

    const { code } = await run('--card', 'gist', '--pat', 'ghp_x', '--out', join(dir, 'card.svg'));

    expect(code).toBe(75);
  });

  it('leaves with 0 when a later render worked', async () => {
    render.mockResolvedValueOnce(REFUSED).mockResolvedValueOnce(DRAWN);
    choose('generate', 'generate');

    const { code } = await run('--card', 'gist', '--pat', 'ghp_x', '--out', join(dir, 'card.svg'));

    expect(code).toBeUndefined();
  });
});
