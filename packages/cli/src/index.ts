#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { parseArgs } from "node:util";

import { CardConfig } from "@stats-forge/github-stats-forge-core";

import { cards, findCard } from "./cards.js";
import type { Menu } from "./prompts.js";
import {
  askRequired,
  askSavePath,
  askToken,
  navigateOptions,
  pickCard,
} from "./prompts.js";
import { defaultFileName, toQuery } from "./query.js";
import {
  readSavedCard,
  savedCardExists,
  toAnswers,
  writeSavedCard,
} from "./saved-card.js";
import { withSpinner } from "./spinner.js";
import { DEFAULT_ENV_FILE, loadEnvFile, resolveTokens } from "./tokens.js";

const HELP = `stats-forge — render a GitHub stats card to a local SVG

Usage
  stats-forge [options]

Options
  -c, --card <id>       Skip the card prompt: ${cards.map((card) => card.id).join(", ")}
  -o, --out <file>      Where to write the card (default: named after the card)
      --config <file>   Options to load, and where "Save these options" writes
      --pat <token>     GitHub token; repeat for several
      --env-file <file> Env file to read PAT_1, PAT_2, … from (default: ${DEFAULT_ENV_FILE})
  -h, --help            Show this
  -v, --version         Show the version

The token can also come from PAT_1 in the environment, or be typed when asked.
`;

/**
 * @returns The flags this run was given.
 */
const readFlags = () =>
  parseArgs({
    options: {
      card: { type: "string", short: "c" },
      out: { type: "string", short: "o" },
      config: { type: "string" },
      pat: { type: "string", multiple: true, default: [] },
      "env-file": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
    allowPositionals: false,
  }).values;

/**
 * Renders one card and writes it next to wherever the run was started.
 *
 * @returns Nothing; the process exits non-zero when the card could not be rendered.
 */
const main = async (): Promise<void> => {
  const flags = readFlags();

  if (flags.help) {
    process.stdout.write(HELP);
    return;
  }
  if (flags.version) {
    // Same relative position from `src/` and from `build/`.
    const manifest = new URL("../package.json", import.meta.url);
    const { version } = JSON.parse(await readFile(manifest, "utf8")) as {
      version: string;
    };
    process.stdout.write(`${version}\n`);
    return;
  }

  // An explicit `--env-file` must exist; the default one is a convenience.
  const envFile = flags["env-file"];
  loadEnvFile(envFile ?? DEFAULT_ENV_FILE, envFile !== undefined);

  // A saved file names its own card and carries its answers, so it skips both prompts.
  const saved =
    flags.config !== undefined && savedCardExists(flags.config)
      ? await readSavedCard(flags.config)
      : undefined;

  if (saved && flags.card !== undefined && flags.card !== saved.card.id) {
    throw new Error(
      `${flags.config ?? ""} holds a ${saved.card.id} card, but --card asked for ${flags.card}.`,
    );
  }

  const card =
    saved?.card ??
    (flags.card === undefined ? await pickCard() : findCard(flags.card));
  if (!card) {
    throw new Error(
      `No card called "${flags.card ?? ""}". Try one of: ${cards
        .map((known) => known.id)
        .join(", ")}`,
    );
  }

  let tokens = resolveTokens(flags.pat, process.env);
  if (card.needsToken && tokens.length === 0) {
    const typed = await askToken();
    if (!typed) {
      throw new Error(
        `The ${card.id} card reads the GitHub API, so it needs a token. Pass --pat, or put PAT_1 in ${DEFAULT_ENV_FILE}.`,
      );
    }
    tokens = [{ name: "prompt", value: typed }];
  }

  const config = new CardConfig({ pats: tokens });
  const menu: Menu = {
    answers: saved ? toAnswers(card, saved.params) : await askRequired(card),
  };
  let savePath = flags.config;

  /*
   * The menu stays open after a render:
   * a card is rarely right the first time, and the whole point of the option
   * list is to change one thing and look again.
   */
  let status: string | undefined;
  let lastFailed = false;

  for (;;) {
    const action = await navigateOptions(card, menu, status);
    if (action === "quit") {
      break;
    }

    const query = toQuery(menu.answers);

    if (action === "save") {
      const path =
        savePath ??
        (await askSavePath(
          defaultFileName(card, query).replace(/\.svg$/, ".json"),
        ));
      if (path) {
        savePath = path;
        const written = await writeSavedCard(path, card, query);
        status = `saved ${relative(process.cwd(), written)} — load it again with --config`;
      }
      continue;
    }

    const result = await withSpinner(`Rendering the ${card.id} card`, () =>
      card.render(query, config),
    );

    if (result.status === "error") {
      const { code, message, secondaryMessage, param } = result.error;
      process.stderr.write(
        [
          `Could not render the ${card.id} card.`,
          `  ${message}${secondaryMessage ? `: ${secondaryMessage}` : ""}`,
          `  code: ${code}${param ? `, param: ${param}` : ""}`,
          result.retryable ? "  This one may work on a retry." : "",
        ]
          .filter(Boolean)
          .join("\n") + "\n",
      );
      // Left on the menu, since a rejected param is one edit away from working.
      status = `${code} — fix it and generate again`;
      lastFailed = true;
      continue;
    }

    const file = resolve(
      process.cwd(),
      flags.out ?? defaultFileName(card, query),
    );
    await writeFile(file, result.content, "utf8");
    const written = relative(process.cwd(), file);
    process.stdout.write(`Wrote ${written}\n`);
    status = `wrote ${written} — edit an option and generate again`;
    lastFailed = false;
  }

  // Leaving straight after a failure still reports one.
  if (lastFailed) {
    process.exitCode = 1;
  }
};

try {
  await main();
} catch (err) {
  // A cancelled prompt is a normal way to leave, not a crash.
  if (err instanceof Error && err.name === "ExitPromptError") {
    process.exitCode = 130;
  } else {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  }
}
