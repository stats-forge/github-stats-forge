import type { ColorParams } from '../common/color.ts';
import type { ErrorCode } from '../common/error.ts';
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
  /** First line of the error card. */
  message: string;
  /** Second line of the error card, when the code has more to say. */
  secondaryMessage: string | undefined;
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

/**
 * Turns anything a handler threw into the one shape it answers with.
 * Anything that is not a `CardError` is treated as upstream's.
 *
 * @returns The rendered error.
 */
export const errorResult = (
  err: unknown,
  /** omitted when it was a color that was rejected, which cannot draw its own error card */
  renderOptions?: ColorParams,
): ApiResult => {
  const error = CardError.from(err);

  return {
    status: 'error',
    retryable: error.retryable,
    error: {
      code: error.code,
      message: error.message,
      secondaryMessage: error.secondaryMessage,
      param: error.param,
    },
    content: renderError({
      message: error.message,
      secondaryMessage: error.secondaryMessage,
      renderOptions: {
        ...renderOptions,
        // A missing param is the caller's to fix, so the card links its docs instead.
        show_repo_link: error.code !== 'missing_param',
      },
    }),
  };
};
