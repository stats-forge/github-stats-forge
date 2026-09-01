import { mkdtempSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { findCard } from "../src/cards.js";
import {
  readSavedCard,
  savedCardExists,
  toAnswers,
  writeSavedCard,
} from "../src/saved-card.js";

const dir = (): string => mkdtempSync(join(tmpdir(), "stats-forge-saved-"));

/**
 * @param name Card to look up.
 * @returns The card, which the catalog always has.
 */
const card = (name: string) => {
  const found = findCard(name);
  if (!found) {
    throw new Error(`the catalog lost ${name}`);
  }
  return found;
};

describe("writeSavedCard", () => {
  it("writes the card and its params as a query string would carry them", async () => {
    const file = join(dir(), "card.json");

    await writeSavedCard(file, card("stats"), {
      username: "anuraghazra",
      show_icons: "true",
    });

    expect(JSON.parse(await readFile(file, "utf8"))).toStrictEqual({
      card: "stats",
      params: { username: "anuraghazra", show_icons: "true" },
    });
  });
});

describe("readSavedCard", () => {
  it("reads back what was written", async () => {
    const file = join(dir(), "card.json");
    await writeSavedCard(file, card("top-langs"), {
      username: "anuraghazra",
      layout: "donut",
    });

    const loaded = await readSavedCard(file);

    expect(loaded.card.id).toBe("top-langs");
    expect(loaded.params).toStrictEqual({
      username: "anuraghazra",
      layout: "donut",
    });
  });

  it("reads a file written by hand", async () => {
    const file = join(dir(), "by-hand.json");
    writeFileSync(file, '{ "card": "gist", "params": { "id": "abc123" } }');

    await expect(readSavedCard(file)).resolves.toMatchObject({
      params: { id: "abc123" },
    });
  });

  it("says so when the file is not JSON", async () => {
    const file = join(dir(), "broken.json");
    writeFileSync(file, "{ not json");

    await expect(readSavedCard(file)).rejects.toThrow(/not readable as JSON/);
  });

  it("says so when the card is not one this version renders", async () => {
    const file = join(dir(), "unknown.json");
    writeFileSync(file, '{ "card": "sparklines", "params": {} }');

    await expect(readSavedCard(file)).rejects.toThrow(/names no card/);
  });

  it("drops a param that could not have come off a query string", async () => {
    const file = join(dir(), "odd.json");
    writeFileSync(
      file,
      '{ "card": "stats", "params": { "username": "x", "hide": ["a"], "card_width": 400 } }',
    );

    await expect(readSavedCard(file)).resolves.toMatchObject({
      params: { username: "x" },
    });
  });
});

describe("savedCardExists", () => {
  it("knows whether there is anything to load", () => {
    const file = join(dir(), "card.json");
    expect(savedCardExists(file)).toBe(false);
    writeFileSync(file, "{}");
    expect(savedCardExists(file)).toBe(true);
  });
});

describe("toAnswers", () => {
  it("gives a boolean option its boolean back", () => {
    const answers = toAnswers(card("stats"), {
      username: "anuraghazra",
      show_icons: "true",
      hide_rank: "false",
    });

    expect(answers.get("username")).toBe("anuraghazra");
    expect(answers.get("show_icons")).toBe(true);
    expect(answers.get("hide_rank")).toBe(false);
  });

  it("leaves everything else as the string it was", () => {
    const answers = toAnswers(card("top-langs"), {
      layout: "donut",
      langs_count: "4",
      hide: "html,css",
    });

    expect(answers.get("layout")).toBe("donut");
    expect(answers.get("langs_count")).toBe("4");
    expect(answers.get("hide")).toBe("html,css");
  });
});
