import type { ThemeParams } from '../common/color.ts';
import type { CardConfig } from '../common/config.ts';
import type { ErrorCode, FailureReason } from '../common/error.ts';
import { CardError } from '../common/error.ts';
import { renderError } from '../common/render.ts';

/**
 * Why a card could not be rendered, in a form a host can act on.
 * The same failure is also drawn onto the result's `content`,
 * so a host never has to read the SVG to find out what happened.
 */
export interface ApiError {
  /** Why it failed. */
  code: ErrorCode;
  /** Which failure this is, finer than `code`; absent for an error core did not raise itself. */
  reason: FailureReason | undefined;
  /** First line of the error card. */
  message: string;
  /** Second line of the error card, when the code has more to say: the host's hint, when it gave one. */
  secondaryMessage: string | undefined;
  /** Both lines as one string of sentences, for a host to print as it is. */
  text: string;
  /**
   * The first param at fault, when the failure names one.
   * `missing_param` names every missing param in `message`, and not every
   * `invalid_param` comes from a single param, so this can be absent.
   */
  param: string | undefined;
}

/** What every api handler returns: a rendered card, or a rendered error. */
export type ApiResult =
  | { status: 'success'; content: string }
  | {
      status: 'error';
      /** Whether repeating the request could produce a different answer. */
      retryable: boolean;
      error: ApiError;
      /** The error, drawn as a card. */
      content: string;
    };

/** @returns The line, ending in sentence punctuation. */
const asSentence = (line: string): string => {
  if (/[.!?]$/.test(line)) {
    return line;
  }
  return `${line}.`;
};

/**
 * Turns anything a handler threw into the one shape it answers with.
 * Anything that is not a `CardError` is treated as upstream's.
 *
 * @returns The rendered error.
 */
export const errorResult = (
  err: unknown,
  hints: CardConfig['hints'],
  /** omitted when it was the theme that was rejected, which cannot draw its own error card */
  renderOptions?: ThemeParams,
): ApiResult => {
  const error = CardError.from(err);
  const hint = error.reason === undefined ? undefined : hints[error.reason];
  const secondaryMessage = hint ?? error.secondaryMessage;

  return {
    status: 'error',
    retryable: error.retryable,
    error: {
      code: error.code,
      reason: error.reason,
      message: error.message,
      secondaryMessage,
      text: [error.message, secondaryMessage]
        .map((line) => line?.trim() ?? '')
        .filter((line) => line !== '')
        .map((line) => asSentence(line))
        .join(' '),
      param: error.param,
    },
    content: renderError({
      message: error.message,
      secondaryMessage,
      renderOptions: {
        ...renderOptions,
        reportable: error.reportable,
      },
    }),
  };
};
