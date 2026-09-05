import { checkbox, confirm, input, password, select } from '@inquirer/prompts';

import type { CardKind, CardOption } from './cards.ts';
import { cards } from './cards.ts';
import type { Answer } from './query.ts';
import { describeAnswer } from './query.ts';

/**
 * @file The navigation itself.
 *
 * A card first, then its required options, then a menu of every other option:
 * pick one, answer it, and land back on the menu with the answer beside it.
 */

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

  const answer = await input({
    message,
    default: current === undefined ? undefined : String(current),
  });
  return answer.trim() === '' ? undefined : answer.trim();
};

/** How a trip through the option menu ended. */
export type MenuChoice = 'generate' | 'save' | 'quit';

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

  for (;;) {
    const choice = await select<CardOption | MenuChoice>({
      message: status ? `${name} — ${status}` : `${name} — set an option, or generate`,
      pageSize: 15,
      // Matched by reference against the values below, so the option objects work.
      // `default` does not accept an explicit undefined, so an unset cursor omits it.
      ...(menu.cursor !== undefined && { default: menu.cursor }),
      choices: [
        { name: 'Generate the card', value: 'generate' as const },
        { name: 'Save these options', value: 'save' as const },
        { name: 'Quit', value: 'quit' as const },
        ...card.options.map((option) => ({
          name: `${option.label.padEnd(38)} ${describeAnswer(option, menu.answers.get(option.name))}`,
          value: option,
        })),
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
