/**
 * A query string's params as a handler takes them.
 * A key given twice is one list, joined on commas the way every list param reads,
 * so `?hide=stars&hide=prs` hides both rather than only the last.
 *
 * @returns One string per key.
 */
export const queryOf = (params: URLSearchParams): Record<string, string> =>
  Object.fromEntries([...new Set(params.keys())].map((key) => [key, params.getAll(key).join(',')]));
