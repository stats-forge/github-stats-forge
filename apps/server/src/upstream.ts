/**
 * @file Upstream answers, held so that cards drawn from the same data cost one request: a card
 * under another theme, or the anvil redrawing as each option changes.
 */

import type { FetchLike } from '@stats-forge/github-stats-forge-core/api';

/** An answer as core reads it: its status and its body, never its headers. */
interface Answer {
  status: number;
  statusText: string;
  body: string;
}

interface HeldAnswer {
  expiresAt: number;
  answer: Promise<Answer>;
  /** What the request was sent with, so a caller who joined it can tell its abort from their own. */
  init: RequestInit | undefined;
  /** Characters of its body counted against the budget; `0` until it lands and is kept. */
  size: number;
}

/**
 * @returns Whether every GraphQL error is a `NOT_FOUND`: the half of a user-or-organization query
 * that names nothing, which asking again cannot change.
 */
const onlyNotFound = (errors: unknown): boolean =>
  Array.isArray(errors) &&
  errors.every(
    (error: unknown) =>
      typeof error === 'object' && error !== null && 'type' in error && error.type === 'NOT_FOUND',
  );

/**
 * GitHub reports a rate limit or a refusal inside a `200`, so a status alone cannot say.
 *
 * @returns Whether the answer is a success worth keeping: a JSON object with no top-level
 * `message`, where GitHub says what went wrong. A GraphQL one also carries `data`, and errors only
 * for what does not exist.
 */
const isKeepable = (url: string, { status, body }: Answer): boolean => {
  if (status < 200 || status > 299) {
    return false;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return false;
  }
  if (typeof parsed !== 'object' || parsed === null || 'message' in parsed) {
    return false;
  }
  if (!url.endsWith('/graphql')) {
    return !('errors' in parsed);
  }
  if (!('data' in parsed) || parsed.data === null) {
    return false;
  }
  return !('errors' in parsed) || onlyNotFound(parsed.errors);
};

/** @returns Whether a request was given up on by the signal it was sent with. */
const isAborted = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

/**
 * @returns `fetchImpl`, answering a request it saw within `ttlSeconds` from the answer it kept and
 * sharing one still in flight; `fetchImpl` itself when either limit is `0`.
 */
const holdingUpstream = (
  fetchImpl: FetchLike,
  ttlSeconds: number,
  /** Characters of body held at most, about as many bytes of JSON; the least used goes first. */
  budget: number,
): FetchLike => {
  if (ttlSeconds <= 0 || budget <= 0) {
    return fetchImpl;
  }
  // in order of use, least recent first
  const held = new Map<string, HeldAnswer>();
  let used = 0;

  const drop = (key: string): void => {
    used -= held.get(key)?.size ?? 0;
    held.delete(key);
  };

  /** Counts a landed answer against the budget, or forgets it when it is not worth keeping. */
  const settle = async (url: string, key: string, entry: HeldAnswer): Promise<void> => {
    let landed: Answer | undefined;
    try {
      landed = await entry.answer;
    } catch {
      // the caller sees the failure; this only forgets it
    }
    if (held.get(key) !== entry) {
      return;
    }
    if (!landed || !isKeepable(url, landed) || landed.body.length > budget) {
      held.delete(key);
      return;
    }
    entry.size = landed.body.length;
    used += entry.size;
    for (const [oldest, { size }] of held) {
      if (used <= budget) {
        return;
      }
      // one still in flight holds nothing yet, so dropping it would free nothing
      if (size > 0) {
        drop(oldest);
      }
    }
  };

  return async (input, init) => {
    // the token is left out, as the card cache leaves it: every token is the deployment's
    const body = typeof init?.body === 'string' ? init.body : '';
    const key = `${init?.method ?? 'GET'} ${input} ${body}`;
    const now = Date.now();

    let entry = held.get(key);
    if (entry && entry.expiresAt > now) {
      held.delete(key);
      held.set(key, entry);
    } else {
      // an expired answer is let go at the next miss rather than when the budget runs out
      for (const [heldKey, { expiresAt }] of held) {
        if (expiresAt <= now) {
          drop(heldKey);
        }
      }
      const ask = async (): Promise<Answer> => {
        const response = await fetchImpl(input, init);
        return {
          status: response.status,
          statusText: response.statusText,
          body: await response.text(),
        };
      };
      entry = { expiresAt: now + ttlSeconds * 1000, answer: ask(), init, size: 0 };
      held.set(key, entry);
      // awaits before any caller does, so a retry after a refusal finds it gone and asks again
      void settle(input, key, entry);
    }

    let landed: Answer;
    try {
      landed = await entry.answer;
    } catch (error) {
      // the request ran on its first caller's timeout; a caller who joined it later has time left
      if (entry.init !== init && isAborted(error) && init?.signal?.aborted !== true) {
        return fetchImpl(input, init);
      }
      throw error;
    }
    return new Response(landed.body, { status: landed.status, statusText: landed.statusText });
  };
};

export { holdingUpstream };
