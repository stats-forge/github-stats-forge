import { stripVTControlCharacters } from 'node:util';

import checkbox from '@inquirer/checkbox';
import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import number from '@inquirer/number';
import password from '@inquirer/password';
import select, { Separator } from '@inquirer/select';
import type { CardKind, CardOption } from '@stats-forge/github-stats-forge-catalog';
import { findCard } from '@stats-forge/github-stats-forge-catalog';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { askRequired, askSavePath, askToken, navigateOptions, pickCard } from '../src/prompts.ts';
import type { Menu } from '../src/prompts.ts';
import type { Answer } from '../src/query.ts';

// A bare `vi.fn()` per prompt, typed back through `vi.mocked` below: a typed one cannot stand in
// for a generic prompt. `Separator` stays real, since the menu is built from it.
vi.mock(import('@inquirer/select'), async (importOriginal) => ({
  ...(await importOriginal()),
  default: vi.fn(),
}));
vi.mock(import('@inquirer/confirm'), () => ({ default: vi.fn() }));
vi.mock(import('@inquirer/checkbox'), () => ({ default: vi.fn() }));
vi.mock(import('@inquirer/input'), () => ({ default: vi.fn() }));
vi.mock(import('@inquirer/number'), () => ({ default: vi.fn() }));
vi.mock(import('@inquirer/password'), () => ({ default: vi.fn() }));

const inquirer = {
  select: vi.mocked(select),
  confirm: vi.mocked(confirm),
  checkbox: vi.mocked(checkbox),
  input: vi.mocked(input),
  number: vi.mocked(number),
  password: vi.mocked(password),
};

afterEach(() => {
  vi.resetAllMocks();
});

/** @returns The catalog's card, which every spec here expects to exist. */
const card = (id: string): CardKind => {
  const found = findCard(id);
  if (!found) {
    throw new Error(`the catalog has a ${id} card`);
  }
  return found;
};

/** @returns The card's option, which every spec here expects to exist. */
const option = (kind: CardKind, name: string): CardOption => {
  const found = kind.options.find((candidate) => candidate.name === name);
  if (!found) {
    throw new Error(`the ${kind.id} card has a ${name} option`);
  }
  return found;
};

/** @returns What the `call`th select listed: a separator's text, or a choice's name. */
const listed = (call: number): Array<string> =>
  (inquirer.select.mock.calls[call]?.[0].choices ?? []).map((choice) => {
    if (choice instanceof Separator) {
      return choice.separator;
    }
    if (typeof choice === 'object' && choice !== null && 'name' in choice) {
      return String(choice.name);
    }
    return String(choice);
  });

describe(pickCard, () => {
  it('offers every card by its label, and answers with the one picked', async () => {
    const stats = card('stats');
    inquirer.select.mockResolvedValue(stats);

    await expect(pickCard()).resolves.toBe(stats);
    expect(listed(0)).toContain(stats.label);
  });
});

describe(navigateOptions, () => {
  it('leads with the actions, then each section the card has an option in', async () => {
    inquirer.select.mockResolvedValue('quit');

    await expect(navigateOptions(card('gist'), { answers: new Map() })).resolves.toBe('quit');

    const rows = listed(0);
    expect(rows.slice(0, 5)).toStrictEqual([
      expect.stringContaining('Actions'),
      'Generate the card',
      'Save these options',
      'Print the query',
      'Quit',
    ]);
    // the gist card counts nothing, so its data section is dropped
    expect(rows.filter((row) => row.includes('──')).slice(1)).toStrictEqual([
      expect.stringContaining('What it shows'),
      expect.stringContaining('Text and size'),
      expect.stringContaining('Colors and border'),
    ]);
    expect(inquirer.select.mock.calls[0]?.[0].message).toBe(
      'Gist pin — set an option, or generate',
    );
  });

  it('adds the keys that jump to an action under the list', async () => {
    inquirer.select.mockResolvedValue('quit');

    await navigateOptions(card('gist'), { answers: new Map() });

    // the theme's `PartialDeep` reads a function as `{}`
    const keysHelpTip = inquirer.select.mock.calls[0]?.[0].theme?.style?.keysHelpTip as
      | ((keys: Array<[string, string]>) => string)
      | undefined;
    expect(stripVTControlCharacters(keysHelpTip?.([['↑↓', 'navigate']]) ?? '')).toBe(
      '↑↓ navigate • type to jump — g generate, s save, p print, q quit',
    );
  });

  it('carries the last outcome in its message', async () => {
    inquirer.select.mockResolvedValue('quit');

    await navigateOptions(card('gist'), { answers: new Map() }, 'wrote gist-abc.svg');

    expect(inquirer.select.mock.calls[0]?.[0].message).toBe('Gist pin — wrote gist-abc.svg');
  });

  it('asks the option picked, keeps the answer, and reopens on it', async () => {
    const gist = card('gist');
    const locale = option(gist, 'locale');
    inquirer.select.mockResolvedValueOnce(locale).mockResolvedValueOnce('generate');
    inquirer.input.mockResolvedValue('  es  ');
    const menu: Menu = { answers: new Map() };

    await expect(navigateOptions(gist, menu)).resolves.toBe('generate');

    expect(menu.answers.get('locale')).toBe('es');
    expect(inquirer.select.mock.calls[1]?.[0].default).toBe(locale);
    expect(menu.cursor).toBe('generate');
    expect(listed(1)).toContainEqual(expect.stringMatching(/^Locale +es$/u));
  });

  it.each<{
    what: string;
    card: string;
    name: string;
    seed?: Answer;
    answer: () => unknown;
    kept: Answer;
    asked: () => unknown;
    with: Record<string, unknown>;
  }>([
    {
      what: 'a boolean with a confirm',
      card: 'gist',
      name: 'show_owner',
      answer: (): unknown => inquirer.confirm.mockResolvedValue(true),
      kept: true,
      asked: (): unknown => inquirer.confirm.mock.calls[0]?.[0],
      with: { default: false },
    },
    {
      what: 'a choice with a select that can unset it',
      card: 'gist',
      name: 'theme',
      seed: 'dark',
      answer: (): unknown => inquirer.select.mockResolvedValueOnce('radical'),
      kept: 'radical',
      asked: (): unknown => inquirer.select.mock.calls[1]?.[0],
      with: {
        default: 'dark',
        choices: expect.arrayContaining([{ name: '— leave unset —', value: undefined }]),
      },
    },
    {
      what: 'a number stepping by any amount, seeded from a saved string',
      card: 'gist',
      name: 'border_radius',
      seed: '10',
      answer: (): unknown => inquirer.number.mockResolvedValue(4.5),
      kept: 4.5,
      asked: (): unknown => inquirer.number.mock.calls[0]?.[0],
      with: { step: 'any', default: 10 },
    },
    {
      what: 'a list of known values with checkboxes, ticked as saved',
      card: 'stats',
      name: 'show',
      seed: ['reviews'],
      answer: (): unknown => inquirer.checkbox.mockResolvedValue(['reviews', 'prs_merged']),
      kept: ['reviews', 'prs_merged'],
      asked: (): unknown => inquirer.checkbox.mock.calls[0]?.[0],
      with: { choices: expect.arrayContaining([{ value: 'reviews', checked: true }]) },
    },
  ])('asks $what', async ({ card: id, name, seed, answer, kept, asked, with: config }) => {
    const kind = card(id);
    inquirer.select.mockResolvedValueOnce(option(kind, name));
    answer();
    inquirer.select.mockResolvedValueOnce('quit');
    const menu: Menu = { answers: new Map(seed === undefined ? [] : [[name, seed]]) };

    await navigateOptions(kind, menu);

    expect(menu.answers.get(name)).toStrictEqual(kept);
    expect(asked()).toMatchObject(config);
  });

  it('forgets an option answered with blank text', async () => {
    const gist = card('gist');
    inquirer.select.mockResolvedValueOnce(option(gist, 'locale')).mockResolvedValueOnce('quit');
    inquirer.input.mockResolvedValue('   ');
    const menu: Menu = { answers: new Map([['locale', 'es']]) };

    await navigateOptions(gist, menu);

    expect(menu.answers.has('locale')).toBe(false);
  });

  it('forgets a list answered with no box ticked', async () => {
    const stats = card('stats');
    inquirer.select.mockResolvedValueOnce(option(stats, 'show')).mockResolvedValueOnce('quit');
    inquirer.checkbox.mockResolvedValue([]);
    const menu: Menu = { answers: new Map([['show', ['reviews']]]) };

    await navigateOptions(stats, menu);

    expect(menu.answers.has('show')).toBe(false);
  });
});

describe(askRequired, () => {
  it('asks only what the seed left out, and refuses a blank answer', async () => {
    inquirer.input.mockResolvedValue('stats-forge');

    const answers = await askRequired(card('pin'), new Map([['username', 'me']]));

    expect(Object.fromEntries(answers)).toStrictEqual({ username: 'me', repo: 'stats-forge' });
    expect(inquirer.input).toHaveBeenCalledTimes(1);
    const validate = inquirer.input.mock.calls[0]?.[0].validate;
    expect(validate?.('  ')).toBe('Required');
    expect(validate?.('x')).toBe(true);
  });
});

describe(askSavePath, () => {
  it.each([
    { typed: ' mine.json ', path: 'mine.json' },
    { typed: '  ', path: undefined },
  ])('answers $path for "$typed", suggesting a name', async ({ typed, path }) => {
    inquirer.input.mockResolvedValue(typed);

    await expect(askSavePath('gist-abc.json')).resolves.toBe(path);
    expect(inquirer.input.mock.calls[0]?.[0]).toMatchObject({ default: 'gist-abc.json' });
  });
});

describe(askToken, () => {
  it.each([
    { typed: ' ghp_x ', token: 'ghp_x' },
    { typed: '', token: undefined },
  ])('answers $token for "$typed", masking what is typed', async ({ typed, token }) => {
    inquirer.password.mockResolvedValue(typed);

    await expect(askToken()).resolves.toBe(token);
    expect(inquirer.password.mock.calls[0]?.[0]).toMatchObject({ mask: '*' });
  });
});
