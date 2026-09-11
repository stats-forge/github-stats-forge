/**
 * @file The navigation itself.
 *
 * A card first, then its required options, then a menu of every other option
 * under the section it belongs to: pick one, answer it, and land back on the
 * menu with the answer beside it.
 */

import { styleText } from 'node:util';

import checkbox from '@inquirer/checkbox';
import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import number from '@inquirer/number';
import password from '@inquirer/password';
import select, { Separator } from '@inquirer/select';

import type { CardKind, CardOption } from './cards.ts';
import { cards, numericStep, OPTION_GROUPS } from './cards.ts';
import type { Answer } from './query.ts';
import { describeAnswer, UNSET } from './query.ts';

/** @returns The card to render. */
export const pickCard = (): Promise<CardKind> =>
  select({
    message: 'Which card?',
    choices: cards.map((card) => ({ name: card.label, value: card })),
  });

/**
 * Asks for one option, seeded with whatever it already holds.
 *
 * @returns The answer, or `undefined` when it was cleared.
 */
const askOption = async (option: CardOption, current: Answer): Promise<Answer> => {
  const message = option.hint ? `${option.label} (${option.hint})` : option.label;

  if (option.kind === 'boolean') {
    return confirm({ message, default: current === true });
  }

  if (option.kind === 'list' && option.choices) {
    const chosen = new Set(Array.isArray(current) ? current : []);
    const picked = await checkbox({
      message,
      pageSize: 15,
      choices: option.choices.map((value) => ({ value, checked: chosen.has(value) })),
    });
    return picked.length > 0 ? picked : undefined;
  }

  if (option.kind === 'choice') {
    const choices = [
      { name: '— leave unset —', value: undefined as Answer },
      ...(option.choices ?? []).map((value) => ({ name: value, value })),
    ];
    return select({ message, choices, default: current });
  }

  const step = numericStep(option.kind);
  if (step !== undefined) {
    // parseFloat is the coercion `Card` performs, and a saved option arrives as a string.
    const seed = current === undefined ? Number.NaN : Number.parseFloat(String(current));
    return number({ message, step, default: Number.isNaN(seed) ? undefined : seed });
  }

  const answer = await input({
    message,
    default: current === undefined ? undefined : String(current),
  });
  return answer.trim() === '' ? undefined : answer.trim();
};

/** How a trip through the option menu ended. */
export type MenuChoice = 'generate' | 'save' | 'quit';

/** Rows the list may use: the terminal, less the message, the help line and some air. */
const menuHeight = (): number =>
  process.stdout.isTTY ? Math.max(10, process.stdout.rows - 6) : 15;

/**
 * A section heading, ruled out to the width of the labels under it.
 *
 * @returns A `Separator`, so the cursor steps straight over it.
 */
const heading = (label: string, width: number): Separator =>
  new Separator(styleText('dim', `── ${label} ${'─'.repeat(Math.max(2, width - label.length))}`));

/**
 * Typing jumps to the first row whose label starts with what was typed, which is
 * what keeps the three actions one key away however far down the list the cursor sits.
 *
 * @returns The line under the list.
 */
const keysHelpTip = (keys: ReadonlyArray<[key: string, action: string]>): string => {
  const all: ReadonlyArray<[string, string]> = [
    ...keys,
    ['type', 'to jump — g generate, s save, q quit'],
  ];
  return all
    .map(([key, action]) => `${styleText('bold', key)} ${styleText('dim', action)}`)
    .join(styleText('dim', ' • '));
};

/** What the menu carries between trips through it. */
export interface Menu {
  /** Answers so far, edited in place. */
  answers: Map<string, Answer>;
  /**
   * Where the cursor sat when the menu was last left.
   * Reopening lands on it, so editing one option after another does not mean
   * scrolling back down each time.
   */
  cursor?: CardOption | MenuChoice | undefined;
}

/**
 * Walks a card's options until the run asks for the card, or to leave.
 *
 * The menu is edited in place, so reopening it after a render keeps every answer
 * and the cursor exactly where they were.
 *
 * @returns Whether to render the card or to stop.
 */
export const navigateOptions = async (
  card: CardKind,
  menu: Menu,
  status?: string,
): Promise<MenuChoice> => {
  // The label carries a description after an em dash; the menu wants the name.
  const [name = card.id] = card.label.split(' — ');
  const width = Math.max(...card.options.map((option) => option.label.length));

  for (;;) {
    // A section none of this card's options sit under is dropped, heading and all.
    const sections = OPTION_GROUPS.flatMap<Separator | { name: string; value: CardOption }>(
      ({ group, label }) => {
        const options = card.options.filter((option) => option.group === group);
        if (options.length === 0) {
          return [];
        }
        return [
          heading(label, width),
          ...options.map((option) => {
            // An unanswered option recedes, so what is set reads as the foreground.
            const answer = describeAnswer(option, menu.answers.get(option.name));
            const value = answer === UNSET ? styleText('dim', answer) : answer;
            return { name: `${option.label.padEnd(width)}  ${value}`, value: option };
          }),
        ];
      },
    );

    const choice = await select<CardOption | MenuChoice>({
      message: status ? `${name} — ${status}` : `${name} — set an option, or generate`,
      pageSize: menuHeight(),
      theme: { style: { keysHelpTip } },
      // Matched by reference against the values below, so the option objects work.
      // `default` does not accept an explicit undefined, so an unset cursor omits it.
      ...(menu.cursor !== undefined && { default: menu.cursor }),
      choices: [
        heading('Actions', width),
        { name: 'Generate the card', value: 'generate' as const },
        { name: 'Save these options', value: 'save' as const },
        { name: 'Quit', value: 'quit' as const },
        ...sections,
      ],
    });

    menu.cursor = choice;

    if (choice === 'generate' || choice === 'save' || choice === 'quit') {
      return choice;
    }

    const answer = await askOption(choice, menu.answers.get(choice.name));
    if (answer === undefined) {
      menu.answers.delete(choice.name);
    } else {
      menu.answers.set(choice.name, answer);
    }
  }
};

/**
 * Asks for the options the card cannot render without.
 *
 * @returns The answers, one per required param.
 */
export const askRequired = async (card: CardKind): Promise<Map<string, Answer>> => {
  const answers = new Map<string, Answer>();
  for (const option of card.required) {
    answers.set(
      option.name,
      await input({
        message: option.label,
        validate: (value) => value.trim() !== '' || 'Required',
      }),
    );
  }
  return answers;
};

/**
 * Asks where to write the options, when no `--config` said.
 *
 * @returns The path, or `undefined` when the run changed its mind.
 */
export const askSavePath = async (suggestion: string): Promise<string | undefined> => {
  const answer = await input({
    message: 'Save the options to',
    default: suggestion,
  });
  return answer.trim() === '' ? undefined : answer.trim();
};

/**
 * Asks for a token, when nothing supplied one.
 *
 * @returns The token, or `undefined` when the run declined to give one.
 */
export const askToken = async (): Promise<string | undefined> => {
  const value = await password({
    message: 'GitHub personal access token (input hidden)',
    mask: '*',
  });
  return value.trim() === '' ? undefined : value.trim();
};
