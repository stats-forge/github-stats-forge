/**
 * @file Every stat row the stats card can draw, worked out from the data and the options.
 */

import type { GitHubDateRange } from '../../common/date.ts';
import { formatRange } from '../../common/date.ts';
import { icons } from '../../common/icons.ts';
import type { commonLocales } from '../../common/locales.ts';
import type { Localized } from '../../common/localize.ts';
import { buildSearchFilter, clampValue } from '../../common/ops.ts';
import type { StatsData } from '../../fetchers/types.ts';
import type { Child } from '../../markup/index.ts';

import type { statCardLocales } from './locales.ts';

/** Stats the card draws only when `show` names them. */
const SHOW_STATS = [
  'contributions',
  'prs_merged',
  'prs_merged_percentage',
  'reviews',
  'discussions_started',
  'discussions_answered',
  'prs_opened',
  'prs_commented',
  'prs_reviewed',
  'issues_opened',
  'issues_commented',
  'contributed_to_all_time',
] as const;
type ShowStat = (typeof SHOW_STATS)[number];

/** Stats the card always draws, and so the ones `hide` has anything to remove. */
const HIDE_STATS = ['stars', 'commits', 'prs', 'issues', 'contributed_to'] as const;
type HideStat = (typeof HIDE_STATS)[number];

/** Every stat the card can draw: the ones it always draws, plus the ones `show` adds. */
type StatId = HideStat | ShowStat;

/** Meta data for a stat, used to build its text node and accessibility label. */
interface StatItem {
  icon: Child;
  label: string;
  value: number | string;
  id: string;
  unitSymbol?: string;
  link?: string;
}

/**
 * @returns What the commit count covers, for the stat's label.
 */
const getTotalCommitsRangeLabel = (
  commitsRange: GitHubDateRange | undefined,
  commonT: Localized<typeof commonLocales>,
): string => {
  if (commitsRange) {
    return ` (${formatRange(commitsRange)})`;
  }

  return ` (${commonT.lastYear()})`;
};

/**
 * Every row these options draw, in drawing order, before `hide` takes any away.
 *
 * @returns The rows, keyed by stat.
 */
const statRows = (
  stats: StatsData,
  {
    show,
    scope,
    include_all_commits,
    number_precision,
  }: {
    show: Array<string>;
    scope: Array<string>;
    include_all_commits: boolean;
    number_precision: number | undefined;
  },
  t: Localized<typeof statCardLocales>,
  commonT: Localized<typeof commonLocales>,
): Partial<Record<StatId, StatItem>> => {
  const {
    login,
    totalStars,
    totalCommits,
    commitsRange,
    totalIssues,
    totalPRs,
    totalPRsMerged,
    mergedPRsPercentage,
    totalReviews,
    totalDiscussionsStarted,
    totalDiscussionsAnswered,
    contributedTo,
    allTimeContributedTo,
    totalPRsAuthored,
    totalPRsCommented,
    totalPRsReviewed,
    totalIssuesAuthored,
    totalIssuesCommented,
    totalContributions,
  } = stats;

  // Typed against the exported list, so a stat drawn here cannot be missing from it.
  const shows = (stat: ShowStat): boolean => show.includes(stat);

  const repoFilter = encodeURIComponent(buildSearchFilter(scope));
  /**
   * A search stat's label, naming where it counted, since nothing else on the card says so.
   *
   * @returns The label, with the scope after it when there is one.
   */
  const scoped = (label: string): string => {
    const [only] = scope;
    if (only === undefined) {
      return label;
    }

    if (scope.length === 1) {
      return `${label} (${only})`;
    }

    return `${label} (${t.scopes({ count: scope.length })})`;
  };

  const STATS: Partial<Record<StatId, StatItem>> = {
    stars: {
      icon: icons.star,
      label: t.totalStars(),
      value: totalStars,
      id: 'stars',
    },
  };

  if (shows('contributions')) {
    STATS['contributions'] = {
      icon: icons.contributions,
      label: t.contributions(),
      value: totalContributions,
      id: 'contributions',
    };
  }

  STATS['commits'] = {
    icon: icons.commits,
    // counted by search only when it is all commits, which is when a scope reaches it
    label: include_all_commits
      ? scoped(t.commits())
      : `${t.commits()}${getTotalCommitsRangeLabel(commitsRange, commonT)}`,
    value: totalCommits,
    id: 'commits',
  };
  STATS['prs'] = {
    icon: icons.prs,
    label: t.prs(),
    value: totalPRs,
    id: 'prs',
  };

  if (shows('prs_merged')) {
    STATS['prs_merged'] = {
      icon: icons.prs_merged,
      label: t.prsMerged(),
      value: totalPRsMerged,
      id: 'prs_merged',
    };
  }

  if (shows('prs_merged_percentage')) {
    STATS['prs_merged_percentage'] = {
      icon: icons.prs_merged_percentage,
      label: t.prsMergedPercentage(),
      value: mergedPRsPercentage.toFixed(
        number_precision !== undefined && Number.isFinite(number_precision)
          ? clampValue(number_precision, 0, 2)
          : 2,
      ),
      id: 'prs_merged_percentage',
      unitSymbol: '%',
    };
  }

  if (shows('reviews')) {
    STATS['reviews'] = {
      icon: icons.reviews,
      label: t.reviews(),
      value: totalReviews,
      id: 'reviews',
    };
  }

  STATS['issues'] = {
    icon: icons.issues,
    label: t.issues(),
    value: totalIssues,
    id: 'issues',
  };

  if (shows('discussions_started')) {
    STATS['discussions_started'] = {
      icon: icons.discussions_started,
      label: t.discussionsStarted(),
      value: totalDiscussionsStarted,
      id: 'discussions_started',
    };
  }
  if (shows('discussions_answered')) {
    STATS['discussions_answered'] = {
      icon: icons.discussions_answered,
      label: t.discussionsAnswered(),
      value: totalDiscussionsAnswered,
      id: 'discussions_answered',
    };
  }

  const encodedUsername = encodeURIComponent(login);
  if (shows('prs_opened')) {
    STATS['prs_opened'] = {
      icon: icons.prs,
      label: scoped(t.prsOpened()),
      value: totalPRsAuthored,
      id: 'prs_opened',
      link: `https://github.com/search?q=${repoFilter}author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (shows('prs_commented')) {
    STATS['prs_commented'] = {
      icon: icons.comments,
      label: scoped(t.prsCommented()),
      value: totalPRsCommented,
      id: 'prs_commented',
      link: `https://github.com/search?q=${repoFilter}commenter%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (shows('prs_reviewed')) {
    STATS['prs_reviewed'] = {
      icon: icons.reviews,
      label: scoped(t.prsReviewed()),
      value: totalPRsReviewed,
      id: 'prs_reviewed',
      link: `https://github.com/search?q=${repoFilter}reviewed-by%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=pullrequests`,
    };
  }
  if (shows('issues_opened')) {
    STATS['issues_opened'] = {
      icon: icons.issues,
      label: scoped(t.issuesOpened()),
      value: totalIssuesAuthored,
      id: 'issues_opened',
      link: `https://github.com/search?q=${repoFilter}author%3A${encodedUsername}&amp;type=issues`,
    };
  }
  if (shows('issues_commented')) {
    STATS['issues_commented'] = {
      icon: icons.discussions_started,
      label: scoped(t.issuesCommented()),
      value: totalIssuesCommented,
      id: 'issues_commented',
      link: `https://github.com/search?q=${repoFilter}commenter%3A${encodedUsername}+-author%3A${encodedUsername}&amp;type=issues`,
    };
  }

  STATS['contributed_to'] = {
    icon: icons.repo,
    label: t.contributedTo(),
    value: contributedTo,
    id: 'contributed_to',
  };

  if (shows('contributed_to_all_time')) {
    STATS['contributed_to_all_time'] = {
      icon: icons.repo,
      label: t.contributedToAllTime(),
      value: allTimeContributedTo,
      id: 'contributed_to_all_time',
    };
  }

  return STATS;
};

export { getTotalCommitsRangeLabel, HIDE_STATS, SHOW_STATS, statRows };
