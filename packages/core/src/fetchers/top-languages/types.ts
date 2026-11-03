export interface Lang {
  name: string;
  // GitHub's GraphQL `Language.color` is nullable — the card falls back to a default.
  color: string | null;
  size: number;
  /** Number of repositories the language appears in. */
  count: number;
}

export type TopLangData = Record<string, Lang>;
