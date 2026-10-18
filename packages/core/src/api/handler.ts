import type * as z from 'zod/mini';

import type { ColorParams } from '../common/color.ts';
import type { AllowlistKind, CardConfig } from '../common/config.ts';
import { CardError } from '../common/error.ts';

import type { ApiResult } from './api-result.ts';
import { errorResult } from './api-result.ts';
import type { ApiQuery, ParamShape } from './params.ts';
import { describeParams, parseColorParams, parseParams, resolveEmpty } from './params.ts';

/** Which of an endpoint's params name an identity, and which list guards each. */
type Identities<TSchema extends z.ZodMiniObject> = Partial<
  Record<Extract<keyof z.output<TSchema>, string>, AllowlistKind>
>;

/** An endpoint, the identities a pinned deployment may refuse it, and how a form asks for each param. */
type CardEndpoint<TSchema extends z.ZodMiniObject> = ((
  query: ApiQuery<TSchema>,
  config: CardConfig,
) => Promise<ApiResult>) & {
  IDENTITIES: Identities<TSchema>;
  PARAMS: Readonly<Record<string, ParamShape>>;
};

/**
 * An endpoint: the schema it accepts, the identities a pinned deployment may refuse,
 * and what it draws from the parsed params.
 *
 * Colors parse first and on their own, because a rejected color cannot be used to draw its own error card.
 * Parsing throws, the allowlist throws, fetching throws, and one `catch` turns whatever was thrown into the answer.
 *
 * @returns The handler, taking the query the schema describes.
 */
const cardHandler = <TSchema extends z.ZodMiniObject>(
  schema: TSchema,
  identities: Identities<TSchema>,
  render: (params: z.output<TSchema>, colors: ColorParams, config: CardConfig) => Promise<string>,
): CardEndpoint<TSchema> => {
  const PARAMS = describeParams(schema.shape);

  const handler = async (raw: ApiQuery<TSchema>, config: CardConfig): Promise<ApiResult> => {
    const query = resolveEmpty(raw, PARAMS);
    let colors: ColorParams;
    try {
      colors = parseColorParams(query);
    } catch (error) {
      return errorResult(error);
    }

    try {
      const params = parseParams(schema, query);

      // before the render, so a refusal costs no rate-limit point; an absent identity is the
      // fetcher's `missing_param` to report
      for (const [param, kind] of Object.entries(identities) as Array<[string, AllowlistKind]>) {
        const value: unknown = (params as Record<string, unknown>)[param];
        if (typeof value === 'string' && !config.isAllowed(value, kind)) {
          throw CardError.because('not_allowed', { param });
        }
      }

      return { status: 'success', content: await render(params, colors, config) };
    } catch (error) {
      return errorResult(error, colors);
    }
  };

  // carried like `OPTIONS`: `tests/allowlist.spec.ts` reads the one, the catalog's test the other
  return Object.assign(handler, { IDENTITIES: identities, PARAMS });
};

export { cardHandler };
