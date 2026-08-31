import type { ColorParams } from "../common/color.js";
import {
  MissingParamError,
  retrieveSecondaryMessage,
} from "../common/error.js";
import { renderError } from "../common/render.js";

/** What every api handler returns: a rendered card, or a rendered error. */
export interface ApiResult {
  status: "success" | "error - permanent" | "error - temporary";
  content: string;
}

/**
 * A request no retry can fix:
 * the query itself is wrong.
 *
 * @param secondaryMessage Line naming what was rejected.
 * @param renderOptions Colors the error card is drawn with;
 *        omitted when it was a color that was rejected.
 * @returns The rendered error.
 */
export const permanentError = (
  secondaryMessage: string,
  renderOptions?: ColorParams,
): ApiResult => ({
  status: "error - permanent",
  content: renderError({
    message: "Something went wrong",
    secondaryMessage,
    ...(renderOptions === undefined ? {} : { renderOptions }),
  }),
});

/**
 * A request that may work later:
 * the fetch failed, not the query.
 *
 * @param err Whatever the fetch threw.
 * @param renderOptions Colors the error card is drawn with.
 * @returns The rendered error.
 */
export const temporaryError = (
  err: unknown,
  renderOptions: ColorParams,
): ApiResult => {
  if (!(err instanceof Error)) {
    return {
      status: "error - temporary",
      content: renderError({
        message: "An unknown error occurred",
        renderOptions,
      }),
    };
  }

  return {
    status: "error - temporary",
    content: renderError({
      message: err.message,
      secondaryMessage: retrieveSecondaryMessage(err),
      renderOptions: {
        ...renderOptions,
        // A missing param is the caller's to fix, so the card links its docs instead.
        show_repo_link: !(err instanceof MissingParamError),
      },
    }),
  };
};
