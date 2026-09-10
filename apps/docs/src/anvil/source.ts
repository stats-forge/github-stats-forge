/**
 * @file Where a preview comes from: a recording that never leaves the browser, or the instance
 * serving the page. A source carries its prose as well as its `draw`, because
 * "nothing you type is sent anywhere" is true of one of them only.
 */

import type { ApiResult, ErrorCode } from '@stats-forge/github-stats-forge-core/api';

import { renderSampleCard } from './render.ts';

/** A drawn card, whichever source drew it. */
interface Preview {
  /** The card, or the error card — and nothing when the draw never happened. */
  content: string | undefined;
  /** What went wrong, or `undefined` when nothing did. */
  problem: string | undefined;
}

/** One way of turning a card and a query into a card. */
interface PreviewSource {
  /** What the picker calls it. */
  label: string;
  /** The standing caveat, in the two halves the badge shows: the chip, and the clause beside it. */
  badge: string;
  aside: string;
  /** The rest of that caveat, which the badge gives up on hover. */
  detail: string;
  /** What the identity fields mean here — the one note whose truth depends on the source. */
  identityNote: string;
  draw: (cardId: string, options: Record<string, string>) => Promise<Preview>;
}

/**
 * What a failure is, in the anvil's own terms, whichever source reports it. A card response
 * carries a code and a param and no prose, so that no upstream string reaches a header every
 * proxy logs; the card says the rest.
 */
const PROBLEMS: Record<ErrorCode, string> = {
  invalid_param: 'That value cannot be drawn',
  missing_param: 'The card cannot be drawn without this',
  not_allowed: 'This deployment does not serve that account',
  not_found: 'GitHub has nothing by that name',
  no_tokens: 'No GitHub token is configured',
  rate_limited: 'Every token is spent for now',
  upstream: 'GitHub answered with something unusable',
};

/** @returns Whether the code is one this page knows. */
const isErrorCode = (value: string): value is ErrorCode => value in PROBLEMS;

/** @returns The one line the status shows for a failure. */
const describeProblem = (code: string, param: string | null | undefined): string => {
  const said = isErrorCode(code) ? PROBLEMS[code] : 'The card could not be drawn';
  return param === null || param === undefined ? said : `${said} ("${param}")`;
};

/** @returns The failure as a line of text, or `undefined` when there was none. */
const problemOf = (result: ApiResult): string | undefined =>
  result.status === 'error' ? describeProblem(result.error.code, result.error.param) : undefined;

/** @returns What the card response says went wrong, or `undefined` when it drew a card. */
const problemFromHeaders = (headers: Headers): string | undefined =>
  headers.get('card-status') === 'error'
    ? describeProblem(headers.get('card-error-code') ?? '', headers.get('card-error-param'))
    : undefined;

const sampleSource: PreviewSource = {
  label: 'Sample data',
  badge: 'Mock data',
  aside: '— the figures never move, whatever you type.',
  detail:
    'Cards are drawn in your browser from saved API responses, so nothing you type is sent anywhere. Options that change how a card looks are exact; those that change its numbers are not.',
  identityNote:
    'These go into the saved file, so the card renders as yours. The preview draws the recorded account whatever you type.',
  draw: async (cardId, options) => {
    const result = await renderSampleCard(cardId, options);
    return { content: result.content, problem: problemOf(result) };
  },
};

/**
 * Absolute, and not under the site's base: the routes are the server's.
 *
 * @returns Where this instance draws that card, which is also what a README points at.
 */
const cardUrl = (cardId: string, options: Record<string, string>): string =>
  `${globalThis.location.origin}/api/${cardId}?${new URLSearchParams(options).toString()}`;

const serverSource: PreviewSource = {
  label: 'This instance',
  badge: 'Live data',
  aside: '— drawn by the instance serving this page.',
  detail:
    'Cards are drawn by the server this page came from, with its GitHub token and its allowlists, so what you type is sent to it and the figures are real. Each redraw spends a request against that token.',
  identityNote:
    'These go into the saved file, and into the preview: the card beside them is drawn for whoever you name.',
  draw: async (cardId, options) => {
    let response: Response;
    try {
      // `no-store`: a builder must see the instance as it is now, not an error card the browser
      // cached for the hour the server said it could
      response = await fetch(cardUrl(cardId, options), { cache: 'no-store' });
    } catch {
      // no content, so the last card stays up
      return { content: undefined, problem: 'This instance did not answer' };
    }

    const type = response.headers.get('content-type') ?? '';
    if (!type.startsWith('image/svg+xml')) {
      return {
        content: undefined,
        problem: `This instance answered ${String(response.status)} rather than a card`,
      };
    }

    return { content: await response.text(), problem: problemFromHeaders(response.headers) };
  },
};

export type { PreviewSource };

export { cardUrl, sampleSource, serverSource };
