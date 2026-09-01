import { confirm, input, password, select } from "@inquirer/prompts";

import type { CardKind, CardOption } from "./cards.js";
import { cards } from "./cards.js";
import type { Answer } from "./query.js";
import { describeAnswer } from "./query.js";

/**
 * @file The navigation itself.
 *
 * A card first, then its required params, then a menu of every other option:
 * pick one, answer it, and land back on the menu with the answer beside it.
 */

/** What the option menu answers with when the run wants the card. */
const GENERATE = Symbol("generate");

/**
 * @returns The card to render.
 */
export const pickCard = async (): Promise<CardKind> =>
  select({
    message: "Which card?",
    choices: cards.map((card) => ({ name: card.label, value: card })),
  });

/**
 * Asks for one option, seeded with whatever it already holds.
 *
 * @param option The option to ask for.
 * @param current What it holds now.
 * @returns The answer, or `undefined` when it was cleared.
 */
const askOption = async (
  option: CardOption,
  current: Answer,
): Promise<Answer> => {
  const message = option.hint
    ? `${option.label} (${option.hint})`
    : option.label;

  if (option.kind === "boolean") {
    return confirm({ message, default: current === true });
  }

  if (option.kind === "choice") {
    const choices = [
      { name: "— leave unset —", value: undefined as Answer },
      ...(option.choices ?? []).map((value) => ({ name: value, value })),
    ];
    return select({ message, choices, default: current });
  }

  const answer = await input({
    message,
    default: current === undefined ? undefined : String(current),
  });
  return answer.trim() === "" ? undefined : answer.trim();
};

/**
 * Walks a card's options until the run asks for the card.
 *
 * @param card The card being built.
 * @param answers Answers so far; required params are already in it.
 * @returns The answers to render with.
 */
export const navigateOptions = async (
  card: CardKind,
  answers: Map<string, Answer>,
): Promise<Map<string, Answer>> => {
  for (;;) {
    // The label carries a description after an em dash; the menu wants the name.
    const [name = card.id] = card.label.split(" — ");
    const choice = await select<CardOption | typeof GENERATE>({
      message: `${name} — set an option, or generate`,
      pageSize: 15,
      choices: [
        { name: "Generate the card", value: GENERATE },
        ...card.options.map((option) => ({
          name: `${option.label.padEnd(38)} ${describeAnswer(option, answers.get(option.name))}`,
          value: option,
        })),
      ],
    });

    if (choice === GENERATE) {
      return answers;
    }

    const answer = await askOption(choice, answers.get(choice.name));
    if (answer === undefined) {
      answers.delete(choice.name);
    } else {
      answers.set(choice.name, answer);
    }
  }
};

/**
 * Asks for the params the card cannot render without.
 *
 * @param card The card being built.
 * @returns The answers, one per required param.
 */
export const askRequired = async (
  card: CardKind,
): Promise<Map<string, Answer>> => {
  const answers = new Map<string, Answer>();
  for (const option of card.required) {
    answers.set(
      option.name,
      await input({
        message: option.label,
        validate: (value) => value.trim() !== "" || "Required",
      }),
    );
  }
  return answers;
};

/**
 * Asks for a token, when nothing supplied one.
 *
 * @returns The token, or `undefined` when the run declined to give one.
 */
export const askToken = async (): Promise<string | undefined> => {
  const value = await password({
    message: "GitHub personal access token (input hidden)",
    mask: "*",
  });
  return value.trim() === "" ? undefined : value.trim();
};
