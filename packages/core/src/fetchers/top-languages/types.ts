export interface Lang {
  name: string;
  // GitHub's GraphQL `Language.color` is nullable — the card falls back to a default.
  color: string | null;
  /** What the card ranks by: `bytes` and `count`, each raised to its weight. */
  size: number;
  /** Bytes of code GitHub attributes to the language, whatever the weights. */
  bytes: number;
  /** Number of repositories the language appears in. */
  count: number;
}

export type TopLangData = Record<string, Lang>;
