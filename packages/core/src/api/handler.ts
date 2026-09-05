import type * as z from 'zod/mini';

import type { ColorParams } from '../common/color.ts';
import type { CardConfig } from '../common/config.ts';

import type { ApiResult } from './api-result.ts';
import { errorResult } from './api-result.ts';
import type { ApiQuery } from './params.ts';
import { parseColorParams, parseParams } from './params.ts';

/**
 * An endpoint: the schema it accepts, and what it draws from the parsed params.
 *
 * Colors parse first and on their own, because a rejected color cannot be used to draw its own error card.
 * Parsing throws, fetching throws, and one `catch` turns whatever was thrown into the answer.
 *
 * @returns The handler, taking the query the schema describes.
 */
const cardHandler =
  <TSchema extends z.ZodMiniType>(
    schema: TSchema,
    render: (params: z.output<TSchema>, colors: ColorParams, config: CardConfig) => Promise<string>,
  ) =>
  async (query: ApiQuery<TSchema>, config: CardConfig): Promise<ApiResult> => {
    let colors: ColorParams;
    try {
      colors = parseColorParams(query);
    } catch (error) {
      return errorResult(error);
    }

    try {
      return {
        status: 'success',
        content: await render(parseParams(schema, query), colors, config),
      };
    } catch (error) {
      return errorResult(error, colors);
    }
  };

export { cardHandler };
