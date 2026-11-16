import { icons } from '@stats-forge/card-kit';
import type { Child } from '@stats-forge/card-kit';

/**
 * The title icon each card wears. They are distinct on purpose: with the heat trail
 * and the shared type, the icon is what tells one card from another at a glance.
 */
const CARD_ICON = {
  contributedTo: icons.prs_merged,
  gist: icons.gist,
  orgActivity: icons.calendar,
  orgCalendar: icons.flame,
  organization: icons.organization,
  repo: icons.repo,
  stats: icons.pulse,
  topLanguages: icons.code,
  wakatime: icons.clock,
} satisfies Record<string, Child>;

export { CARD_ICON };
