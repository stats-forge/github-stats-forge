import { cardHandlerFor } from '@stats-forge/card-kit';
import type { CardHandler } from '@stats-forge/card-kit';

import type { CardConfig } from '../common/config.ts';

/**
 * An endpoint: the schema it accepts, the identities a pinned deployment may refuse,
 * and what it draws from the parsed params, given this package's config.
 */
const cardHandler: CardHandler<CardConfig> = cardHandlerFor<CardConfig>();

export { cardHandler };
