/**
 * @file One structured line per request, on stdout.
 *
 * **Never a query value: they hold usernames.** A token cannot reach here either — core's
 * `PersonalAccessToken` carries the env var's name for exactly that reason.
 */

import { cardIdFor, normalizePath } from './routes.ts';

/** What a served request is worth recording. */
interface RequestLog {
  method: string;
  path: string;
  /** Which card was drawn, absent when the path was not a card's. */
  card: string | undefined;
  status: number;
  /** `success` or `error`, from the answer's own header; absent when no card was drawn. */
  card_status: string | undefined;
  /** The `ErrorCode`, when the card was an error card. */
  error_code: string | undefined;
  /** Whether the in-process cache answered it. */
  cache: string | undefined;
  duration_ms: number;
}

/** Records what was served, reading the answer's own headers rather than a second return channel. */
const logRequest = (request: Request, response: Response, startedAt: number): void => {
  const path = normalizePath(new URL(request.url).pathname);
  const line: RequestLog = {
    method: request.method,
    path,
    card: cardIdFor(path),
    status: response.status,
    card_status: response.headers.get('card-status') ?? undefined,
    error_code: response.headers.get('card-error-code') ?? undefined,
    cache: response.headers.get('card-cache') ?? undefined,
    duration_ms: Math.round(performance.now() - startedAt),
  };
  process.stdout.write(`${JSON.stringify(line)}\n`);
};

export { logRequest };
