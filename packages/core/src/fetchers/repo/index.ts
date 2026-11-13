import type { CardConfig } from '../../common/config.ts';
import { CardError, fromGraphQL } from '../../common/error.ts';
import { createGraphQLFetcher } from '../../common/http.ts';
import { retryer } from '../../common/retryer.ts';
import { GetRepoDocument } from '../../graphql/generated/repo.ts';
import type { RepoInfoFragment } from '../../graphql/generated/repo.ts';
import { fetchRepoUserStats } from '../stats/index.ts';
import type { RepoUserSearch } from '../stats/index.ts';
import type { RepoUserStats } from '../stats/types.ts';

import type { RepositoryData } from './types.ts';

const fetcher = createGraphQLFetcher(GetRepoDocument);

const urlExample = '/api/pin?username=USERNAME&repo=REPO_NAME';

/**
 * @returns The repository as the card reads it, its topics flattened to their names.
 */
const toRepositoryData = (
  { repositoryTopics, ...repository }: RepoInfoFragment,
  stats: RepoUserStats,
): RepositoryData => {
  if (!repositoryTopics) {
    return { ...stats, ...repository };
  }

  const topics = (repositoryTopics.nodes ?? []).flatMap((node) => (node ? [node.topic.name] : []));
  return { ...stats, ...repository, topics };
};

/**
 * Fetch repository data.
 *
 * @returns Repository data.
 */
const fetchRepo = async (
  {
    username,
    reponame,
    searches = [],
    include_topics = false,
  }: {
    username: string | undefined;
    reponame: string | undefined;
    /** The search-based counts to fetch, within this repository. */
    searches?: ReadonlyArray<RepoUserSearch>;
    include_topics?: boolean | undefined;
  },
  config: CardConfig,
): Promise<RepositoryData> => {
  // `?repo=owner/name` carries the owner itself, and then it wins over `?username=`.
  let parsedOwner = username;
  let repo = reponame;
  if (repo?.includes('/')) {
    const [ownerFromRepo, nameFromRepo] = repo.split('/');
    parsedOwner = ownerFromRepo ?? '';
    repo = nameFromRepo ?? '';
  }

  const login = username || parsedOwner;
  if (!login && !repo) {
    throw CardError.because('missing_param', { params: ['username', 'repo'], hint: urlExample });
  }
  if (!login) {
    throw CardError.because('missing_param', { params: ['username'], hint: urlExample });
  }
  if (!repo) {
    throw CardError.because('missing_param', { params: ['repo'], hint: urlExample });
  }

  const repoOwner = parsedOwner || login;

  const res = await retryer(
    fetcher,
    { login: repoOwner, repo, includeTopics: include_topics },
    config,
  );

  // the half naming no such login always fails NOT_FOUND
  const failures = res.data.errors?.filter(({ type }) => type !== 'NOT_FOUND') ?? [];
  if (failures.length > 0) {
    throw fromGraphQL(failures, res.statusText, 'repository', config.logger);
  }
  const { data } = res.data;
  // a login is a user or an organization, never both
  const repository = (data.user ?? data.organization)?.repository;
  if (!repository || repository.isPrivate) {
    throw CardError.because('repo_not_found');
  }

  const repoUserStats = await fetchRepoUserStats(
    {
      username: login,
      scope: [`${repoOwner}/${repo}`],
      searches,
    },
    config,
  );
  return toRepositoryData(repository, repoUserStats);
};

export { fetchRepo };
