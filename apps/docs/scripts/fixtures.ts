/**
 * @file The fictional account every card on the site is drawn from — the anvil's samples and the
 * pages' previews alike — and a `fetch` that answers as GitHub and WakaTime would for it.
 *
 * Every login, repository and figure is invented. The figures are picked so each option has
 * something to change: stars that read differently under `number_format`, more languages than the
 * default `langs_count` with one spread thin across many repositories for `count_weight`, more
 * repositories contributed to than `repos_count` allows, and a description long enough to wrap.
 *
 * Each answer is typed as the result core's own query is generated as, so a query that changes
 * shape fails `pnpm typecheck` here until the fixture follows it. Those types are not part of
 * core's public api, hence the type-only imports from its source.
 */

import type { FetchLike } from '@stats-forge/github-stats-forge-core/api';
import type { WakaTimeData } from '@stats-forge/github-stats-forge-core/fetchers';

import type { GraphQLResponse } from '../../../packages/core/src/common/http.ts';
import type { ContributionsQuery } from '../../../packages/core/src/graphql/contributionsDocument.ts';
import type { UserContributionYearsQuery } from '../../../packages/core/src/graphql/generated/contributed-to.ts';
import type { GistInfoQuery } from '../../../packages/core/src/graphql/generated/gist.ts';
import type { GetOrganizationActivityQuery } from '../../../packages/core/src/graphql/generated/org-activity.ts';
import type { GetOrganizationQuery } from '../../../packages/core/src/graphql/generated/organization.ts';
import type { GetRepoQuery } from '../../../packages/core/src/graphql/generated/repo.ts';
import type {
  RangeContributionsByRepoFragment,
  UserInfoQuery,
} from '../../../packages/core/src/graphql/generated/stats.ts';
import type { TopLanguagesQuery } from '../../../packages/core/src/graphql/generated/top-languages.ts';
import type { ReposContributedToQuery } from '../../../packages/core/src/graphql/reposContributedToDocument.ts';
import { SAMPLE } from '../src/anvil/cards.ts';

const CONTRIBUTION_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

/** @returns Every year from `first` to `last`, both included. */
const span = (first: number, last: number): Array<number> =>
  Array.from({ length: last - first + 1 }, (_, index) => first + index);

const LANGUAGE_COLORS: Readonly<Record<string, string>> = {
  CSS: '#663399',
  Dockerfile: '#384d54',
  Elixir: '#6e4a7e',
  Go: '#00ADD8',
  HTML: '#e34c26',
  'Jupyter Notebook': '#DA5B0B',
  Lua: '#000080',
  Makefile: '#427819',
  Python: '#3572A5',
  Rust: '#dea584',
  Shell: '#89e051',
  Svelte: '#ff3e00',
  TypeScript: '#3178c6',
  'Vim Script': '#199f4b',
};

/** @returns The language as GitHub's GraphQL API describes one. */
const language = (name: string): { name: string; color: string } => ({
  name,
  color: LANGUAGE_COLORS[name] ?? '#cccccc',
});

/** The user's own repositories: their stars, and the bytes of each language in them. */
const USER_REPOS: ReadonlyArray<{
  name: string;
  stars: number;
  languages: Record<string, number>;
}> = [
  { name: SAMPLE.repo, stars: 4821, languages: { Rust: 412_000, Shell: 9800, Dockerfile: 1200 } },
  { name: 'tongs-cli', stars: 2964, languages: { Go: 298_000, Shell: 14_200, Makefile: 3100 } },
  { name: 'bellows', stars: 1587, languages: { TypeScript: 254_000, CSS: 38_000, HTML: 12_400 } },
  { name: 'slag', stars: 1243, languages: { Python: 186_000, 'Jupyter Notebook': 142_000 } },
  { name: 'rivet', stars: 806, languages: { Rust: 98_000, Lua: 16_000 } },
  {
    name: 'whetstone',
    stars: 512,
    languages: { TypeScript: 121_000, Svelte: 87_000, CSS: 21_000 },
  },
  { name: 'ingot', stars: 298, languages: { Elixir: 74_000, HTML: 8800 } },
  { name: 'hammerfall', stars: 187, languages: { Go: 41_000, Dockerfile: 900 } },
  { name: 'ember.nvim', stars: 142, languages: { Lua: 52_000, 'Vim Script': 6400 } },
  { name: 'dotfiles', stars: 76, languages: { Shell: 23_000, Lua: 11_000, 'Vim Script': 4100 } },
  { name: 'scratchpad', stars: 19, languages: { Python: 7300, Shell: 2100 } },
  // unstarred, so the stats card stops paging here
  { name: 'notes', stars: 0, languages: {} },
];

/** What the contributed-to walk finds: a repository, what it got each year, and in which years. */
const CONTRIBUTIONS: ReadonlyArray<{
  repo: string;
  kind: 'commit' | 'issue' | 'pullRequest';
  perYear: number;
  years: Array<number>;
}> = [
  { repo: `${SAMPLE.org}/crucible`, kind: 'commit', perYear: 31, years: span(2018, 2026) },
  { repo: `${SAMPLE.org}/crucible`, kind: 'pullRequest', perYear: 8, years: span(2018, 2026) },
  { repo: `${SAMPLE.org}/hearth`, kind: 'commit', perYear: 18, years: span(2020, 2026) },
  { repo: `${SAMPLE.org}/hearth`, kind: 'issue', perYear: 3, years: span(2020, 2026) },
  { repo: 'tidewater/harbor', kind: 'commit', perYear: 25, years: span(2022, 2026) },
  { repo: 'mossy-stone/terrace', kind: 'commit', perYear: 64, years: [2018] },
  { repo: 'lumen-labs/prism-ui', kind: 'pullRequest', perYear: 12, years: span(2017, 2021) },
  { repo: 'cobalt-collective/kiln', kind: 'commit', perYear: 14, years: span(2019, 2023) },
  { repo: 'riverbend/weir', kind: 'commit', perYear: 32, years: span(2025, 2026) },
  { repo: 'ironbark/lattice', kind: 'pullRequest', perYear: 20, years: span(2021, 2022) },
  { repo: 'quillworks/inkwell', kind: 'pullRequest', perYear: 9, years: span(2023, 2026) },
  { repo: 'quillworks/inkwell', kind: 'issue', perYear: 4, years: span(2023, 2026) },
  { repo: 'orchard-tools/graft', kind: 'commit', perYear: 10, years: span(2019, 2021) },
  { repo: 'copperleaf/patina', kind: 'commit', perYear: 7, years: span(2021, 2024) },
  { repo: 'bramble-net/thicket', kind: 'pullRequest', perYear: 11, years: [2023] },
  { repo: 'northwind-oss/compass', kind: 'issue', perYear: 6, years: span(2017, 2019) },
  { repo: 'gearbox-io/sprocket', kind: 'pullRequest', perYear: 9, years: [2020, 2025] },
  { repo: 'granite-works/quarry', kind: 'commit', perYear: 5, years: span(2017, 2020) },
  { repo: 'emberlight/wick', kind: 'pullRequest', perYear: 6, years: [2026] },
  { repo: 'starling-dev/murmur', kind: 'issue', perYear: 5, years: span(2024, 2026) },
  { repo: 'halcyon-sh/drift', kind: 'pullRequest', perYear: 4, years: span(2017, 2018) },
  { repo: 'wildflower-ui/bloom', kind: 'pullRequest', perYear: 3, years: span(2024, 2026) },
  { repo: 'paper-lantern/glow', kind: 'issue', perYear: 3, years: span(2022, 2023) },
  { repo: 'saltmarsh/tide-tables', kind: 'issue', perYear: 2, years: [2020] },
  { repo: 'foxglove-js/petal', kind: 'issue', perYear: 2, years: span(2018, 2019) },
  // the user's own, which only `include_own_repos` counts
  {
    repo: `${SAMPLE.username}/${SAMPLE.repo}`,
    kind: 'commit',
    perYear: 120,
    years: span(2019, 2026),
  },
  { repo: `${SAMPLE.username}/tongs-cli`, kind: 'commit', perYear: 84, years: span(2021, 2026) },
  { repo: `${SAMPLE.username}/bellows`, kind: 'commit', perYear: 66, years: span(2017, 2022) },
  { repo: `${SAMPLE.username}/slag`, kind: 'commit', perYear: 47, years: span(2024, 2026) },
];

/** The year each of the user's own repositories was created in. */
const CREATED: Readonly<Record<string, number>> = {
  [`${SAMPLE.username}/bellows`]: 2017,
  [`${SAMPLE.username}/${SAMPLE.repo}`]: 2019,
  [`${SAMPLE.username}/tongs-cli`]: 2021,
  [`${SAMPLE.username}/slag`]: 2024,
};

/** Commits, then every contribution the calendar counts, per year. */
const YEARLY: Readonly<Record<number, [commits: number, contributions: number]>> = {
  2017: [212, 341],
  2018: [389, 502],
  2019: [604, 811],
  2020: [877, 1190],
  2021: [731, 1043],
  2022: [958, 1376],
  2023: [1102, 1594],
  2024: [1240, 1802],
  2025: [1311, 1957],
  2026: [1084, 1520],
};

/** What each REST search counts, by the qualifiers that tell one figure from another. */
const SEARCH_COUNTS: Readonly<Record<string, number>> = {
  'commits|author': 9126,
  'commits|org': 1342,
  'issues|author|type:pr': 318,
  'issues|commenter|type:pr': 457,
  'issues|reviewed-by|type:pr': 612,
  'issues|author|type:issue': 96,
  'issues|commenter|type:issue': 233,
};

/** The organization's public repositories, most starred first, as `OrgRepoInfo` reads them. */
const ORG_REPOS: ReadonlyArray<{
  stars: number;
  forks: number;
  language: string | null;
  watchers: number;
  issues: number;
  pullRequests: number;
  releases: number;
  commits: number;
}> = [
  {
    stars: 8214,
    forks: 731,
    language: 'TypeScript',
    watchers: 214,
    issues: 42,
    pullRequests: 17,
    releases: 64,
    commits: 3812,
  },
  {
    stars: 3905,
    forks: 288,
    language: 'Rust',
    watchers: 98,
    issues: 23,
    pullRequests: 9,
    releases: 31,
    commits: 2140,
  },
  {
    stars: 1822,
    forks: 147,
    language: 'Go',
    watchers: 61,
    issues: 11,
    pullRequests: 6,
    releases: 22,
    commits: 1288,
  },
  {
    stars: 940,
    forks: 66,
    language: 'TypeScript',
    watchers: 33,
    issues: 7,
    pullRequests: 3,
    releases: 15,
    commits: 612,
  },
  {
    stars: 418,
    forks: 29,
    language: 'Python',
    watchers: 17,
    issues: 5,
    pullRequests: 2,
    releases: 8,
    commits: 377,
  },
  {
    stars: 126,
    forks: 34,
    language: null,
    watchers: 12,
    issues: 2,
    pullRequests: 1,
    releases: 0,
    commits: 204,
  },
  {
    stars: 87,
    forks: 12,
    language: 'Shell',
    watchers: 9,
    issues: 1,
    pullRequests: 0,
    releases: 6,
    commits: 143,
  },
];

/** Hours and minutes per language over the last seven days. */
const WAKATIME_LANGUAGES: ReadonlyArray<[name: string, hours: number, minutes: number]> = [
  ['TypeScript', 14, 22],
  ['Rust', 9, 48],
  ['Go', 5, 31],
  ['Python', 3, 12],
  ['Markdown', 1, 47],
  ['YAML', 1, 5],
  ['Lua', 0, 41],
  ['Bash', 0, 26],
  ['JSON', 0, 18],
  ['Other', 0, 9],
];

/** A GraphQL response body. Typing a builder with it is what fails a changed query; never `unknown`. */
type Body<T> = GraphQLResponse<T>['data'];

/** One duration WakaTime breaks the week down by. */
type Duration = WakaTimeData['languages'][number];

/** @returns A count, as GitHub's connections carry one. */
const total = (totalCount: number): { totalCount: number } => ({ totalCount });

const userInfo = (): Body<UserInfoQuery> => ({
  data: {
    user: {
      name: 'Ember Smith',
      login: SAMPLE.username,
      commits: { totalCommitContributions: 1284 },
      reviews: { totalPullRequestReviewContributions: 312 },
      repositoriesContributedTo: total(14),
      pullRequests: total(1536),
      mergedPullRequests: total(1302),
      openIssues: total(38),
      closedIssues: total(251),
      followers: total(2480),
      repositoryDiscussions: total(64),
      repositoryDiscussionComments: total(27),
      contributionsCollection: { contributionYears: CONTRIBUTION_YEARS.toReversed() },
      repositories: {
        totalCount: 58,
        nodes: USER_REPOS.map(({ name, stars }) => ({
          name,
          nameWithOwner: `${SAMPLE.username}/${name}`,
          stargazerCount: stars,
        })),
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    },
  },
});

/** @returns The year each `range_N` alias starts in, in alias order. */
const rangeYears = (query: string): Array<number> =>
  [...query.matchAll(/range_\d+:\s*contributionsCollection\(from:\s*"(?<year>\d{4})/g)].map(
    (match) => Number(match.groups?.['year']),
  );

const userContributions = (query: string): Body<ContributionsQuery> => ({
  data: {
    user: Object.fromEntries(
      rangeYears(query).map((year, index) => {
        const [commits, contributions] = YEARLY[year] ?? [0, 0];
        return [
          `range_${String(index)}`,
          {
            totalCommitContributions: commits,
            contributionCalendar: { totalContributions: contributions },
          },
        ];
      }),
    ),
  },
});

/** @returns One `…ContributionsByRepository` list for a year. */
const byRepository = (
  kind: (typeof CONTRIBUTIONS)[number]['kind'],
  year: number,
): RangeContributionsByRepoFragment['commitContributionsByRepository'] =>
  CONTRIBUTIONS.filter((entry) => entry.kind === kind && entry.years.includes(year)).map(
    (entry) => ({
      repository: { nameWithOwner: entry.repo },
      // varied by year, so no two rows tie for long
      contributions: total(entry.perYear + ((year * 7) % 5)),
    }),
  );

const userReposContributedTo = (query: string): Body<ReposContributedToQuery> => {
  const includeOwnRepos = query.includes('repositoryContributions');
  return {
    data: {
      user: Object.fromEntries(
        rangeYears(query).map((year, index) => [
          `range_${String(index)}`,
          {
            commitContributionsByRepository: byRepository('commit', year),
            issueContributionsByRepository: byRepository('issue', year),
            pullRequestContributionsByRepository: byRepository('pullRequest', year),
            ...(includeOwnRepos && {
              repositoryContributions: {
                nodes: Object.entries(CREATED)
                  .filter(([, created]) => created === year)
                  .map(([nameWithOwner]) => ({ repository: { nameWithOwner } })),
              },
            }),
          },
        ]),
      ),
    },
  };
};

const userContributionYears = (): Body<UserContributionYearsQuery> => ({
  data: {
    user: {
      login: SAMPLE.username,
      contributionsCollection: { contributionYears: CONTRIBUTION_YEARS.toReversed() },
    },
  },
});

const topLanguages = (): Body<TopLanguagesQuery> => ({
  data: {
    user: {
      repositories: {
        nodes: USER_REPOS.map(({ name, languages }) => ({
          name,
          nameWithOwner: `${SAMPLE.username}/${name}`,
          languages: {
            edges: Object.entries(languages).map(([lang, size]) => ({
              size,
              node: language(lang),
            })),
          },
        })),
      },
    },
  },
});

/** The organization half fails as GitHub fails it when the owner is a user. */
const getRepo = (): Body<GetRepoQuery> => ({
  data: {
    user: {
      repository: {
        name: SAMPLE.repo,
        nameWithOwner: `${SAMPLE.username}/${SAMPLE.repo}`,
        isPrivate: false,
        isArchived: false,
        isTemplate: false,
        stargazerCount: 4821,
        description:
          'Tempers flaky test suites :fire: reruns them, quarantines the stubborn ones and reports the tests that only fail on Fridays.',
        primaryLanguage: { ...language('Rust'), id: 'MDg6TGFuZ3VhZ2UyNTA=' },
        forkCount: 312,
      },
    },
    organization: null,
  },
  errors: [
    {
      type: 'NOT_FOUND',
      path: ['organization'],
      message: `Could not resolve to an Organization with the login of '${SAMPLE.username}'.`,
    },
  ],
});

const gistInfo = (): Body<GistInfoQuery> => ({
  data: {
    viewer: {
      gist: {
        description: 'Heat-treat a monorepo: the one-liners I keep reaching for',
        owner: { login: SAMPLE.username },
        stargazerCount: 286,
        forks: total(41),
        files: [
          { name: 'anneal.ts', language: { name: 'TypeScript' }, size: 4120 },
          { name: 'temper.sh', language: { name: 'Shell' }, size: 2380 },
          { name: 'README.md', language: { name: 'Markdown' }, size: 1650 },
        ],
      },
    },
  },
});

const ORG_NAME = 'The Forge Guild';

const getOrganization = (): Body<GetOrganizationQuery> => ({
  data: {
    organization: {
      login: SAMPLE.org,
      name: ORG_NAME,
      description:
        'Open-source tooling for smiths of every trade: build pipelines, test harnesses and the odd README card.',
      createdAt: '2018-04-23T10:12:44Z',
      membersWithRole: total(37),
      repositories: {
        totalCount: ORG_REPOS.length,
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: ORG_REPOS.map((repo) => ({
          stargazerCount: repo.stars,
          forkCount: repo.forks,
          primaryLanguage: repo.language === null ? null : language(repo.language),
          watchers: total(repo.watchers),
          issues: total(repo.issues),
          pullRequests: total(repo.pullRequests),
          releases: total(repo.releases),
          defaultBranchRef: { target: { history: total(repo.commits) } },
        })),
      },
    },
  },
});

const getOrganizationActivity = (): Body<GetOrganizationActivityQuery> => ({
  data: {
    organization: { login: SAMPLE.org, name: ORG_NAME },
    prsOpened: { issueCount: 214 },
    prsMerged: { issueCount: 187 },
    // each issue search names what it matched, which is how core tells issues from pull requests
    issuesOpened: { issueCount: 96, nodes: [{ __typename: 'Issue' }] },
    issuesClosed: { issueCount: 81, nodes: [{ __typename: 'Issue' }] },
    discussions: { discussionCount: 23 },
  },
});

/** @returns A duration as WakaTime words one, e.g. `9 hrs 48 mins`. */
const readable = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours === 0 ? `${String(minutes)} mins` : `${String(hours)} hrs ${String(minutes)} mins`;
};

/** @returns A share of the week in every form WakaTime writes one. */
const duration = (name: string, seconds: number, ofTotal: number): Duration => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return {
    name,
    total_seconds: seconds,
    percent: Math.round((seconds / ofTotal) * 10_000) / 100,
    digital: `${String(hours)}:${String(minutes).padStart(2, '0')}`,
    text: readable(seconds),
    hours,
    minutes,
  };
};

const wakatime = (): { data: WakaTimeData } => {
  const languages = WAKATIME_LANGUAGES.map(
    ([name, hours, minutes]) => [name, hours * 3600 + minutes * 60] as const,
  );
  const seconds = languages.reduce((sum, [, languageSeconds]) => sum + languageSeconds, 0);
  const dailyAverage = Math.round(seconds / 7);
  const inVsCode = Math.round((seconds * 0.7) / 60) * 60;

  return {
    data: {
      id: '00000000-0000-4000-8000-000000000001',
      user_id: '00000000-0000-4000-8000-000000000002',
      username: SAMPLE.wakatime,
      range: 'last_7_days',
      timeout: 15,
      writes_only: false,
      percent_calculated: 100,
      total_seconds_including_other_language: seconds,
      status: 'ok',
      is_up_to_date: true,
      is_already_updating: false,
      is_stuck: false,
      is_including_today: true,
      is_coding_activity_visible: true,
      is_other_usage_visible: true,
      days_including_holidays: 7,
      days_minus_holidays: 6,
      holidays: 1,
      total_seconds: seconds,
      daily_average: dailyAverage,
      daily_average_including_other_language: dailyAverage,
      human_readable_total: readable(seconds),
      human_readable_total_including_other_language: readable(seconds),
      human_readable_daily_average: readable(dailyAverage),
      human_readable_daily_average_including_other_language: readable(dailyAverage),
      languages: languages.map(([name, languageSeconds]) =>
        duration(name, languageSeconds, seconds),
      ),
      editors: [
        duration('VS Code', inVsCode, seconds),
        duration('Neovim', seconds - inVsCode, seconds),
      ],
      categories: [duration('Coding', seconds, seconds)],
      operating_systems: [duration('Linux', seconds, seconds)],
    },
  };
};

/** Answered by operation name; the two built at runtime read their ranges off the query. */
const GRAPHQL: Readonly<Record<string, (query: string) => unknown>> = {
  gistInfo,
  getOrganization,
  getOrganizationActivity,
  getRepo,
  topLanguages,
  userContributionYears,
  userContributions,
  userInfo,
  userReposContributedTo,
};

/** @returns The key `SEARCH_COUNTS` holds that search's figure under. */
const searchKind = (url: URL): string => {
  const qualifiers = (url.searchParams.get('q') ?? '').split(/[\s+]+/);
  const index = url.pathname.replace('/search/', '');
  if (index === 'commits') {
    return qualifiers.some((token) => token.startsWith('org:')) ? 'commits|org' : 'commits|author';
  }
  const role = ['reviewed-by', 'commenter', 'author'].find((name) =>
    qualifiers.some((token) => token.startsWith(`${name}:`)),
  );
  const type = qualifiers.find((token) => token.startsWith('type:'));
  return `${index}|${role ?? ''}|${type ?? ''}`;
};

/**
 * A request it has no answer for throws, so a card that starts asking something new fails the
 * generator rather than quietly drawing an error card.
 *
 * @returns A `fetch` that answers the anvil's requests from the fictional account.
 */
const fixtureFetch: FetchLike = (input, init) => {
  const url = new URL(input);

  if (url.pathname.startsWith('/api/v1/users/')) {
    return Promise.resolve(Response.json(wakatime()));
  }

  if (url.pathname.startsWith('/search/')) {
    const kind = searchKind(url);
    const count = SEARCH_COUNTS[kind];
    if (count === undefined) {
      throw new Error(`No fixture for the search "${kind}"`);
    }
    return Promise.resolve(
      Response.json({ total_count: count, incomplete_results: false, items: [] }),
    );
  }

  const { query } = JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as {
    query?: string;
  };
  const name = /\bquery\s+(?<name>\w+)/.exec(query ?? '')?.groups?.['name'];
  const answer = name === undefined ? undefined : GRAPHQL[name];
  if (query === undefined || answer === undefined) {
    throw new Error(`No fixture for the operation "${name ?? input}"`);
  }
  return Promise.resolve(Response.json(answer(query)));
};

export { fixtureFetch };
