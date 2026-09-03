import type { CardConfig } from '../common/config.js';
import { CardError, REPO_NOT_FOUND } from '../common/error.js';
import { createGraphQLFetcher } from '../common/http.js';
import { retryer } from '../common/retryer.js';
import { GetRepoDocument } from '../graphql/generated/repo.js';

import { fetchRepoUserStats } from './stats.js';
import type { RepositoryData } from './types.js';

const fetcher = createGraphQLFetcher(GetRepoDocument, 'token');

const urlExample = '/api/pin?username=USERNAME&repo=REPO_NAME';

/**
 * Fetch repository data.
 *
 * @param props Fetcher props.
 * @param props.username GitHub username.
 * @param props.reponame GitHub repository name.
 * @param props.include_prs_authored Include count of PRs authored.
 * @param props.include_prs_commented Include count of PRs commented.
 * @param props.include_prs_reviewed Include count of PRs reviewed.
 * @param props.include_issues_authored Include count of issues authored.
 * @param props.include_issues_commented Include count of issues commented.
 * @param config Deployment config supplying the PAT pool.
 * @returns Repository data.
 */
const fetchRepo = async (
  {
    username,
    reponame,
    include_prs_authored = false,
    include_prs_commented = false,
    include_prs_reviewed = false,
    include_issues_authored = false,
    include_issues_commented = false,
  }: {
    username: string | undefined;
    reponame: string | undefined;
    include_prs_authored?: boolean | undefined;
    include_prs_commented?: boolean | undefined;
    include_prs_reviewed?: boolean | undefined;
    include_issues_authored?: boolean | undefined;
    include_issues_commented?: boolean | undefined;
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
    throw CardError.missingParam(['username', 'repo'], urlExample);
  }
  if (!login) {
    throw CardError.missingParam(['username'], urlExample);
  }
  if (!repo) {
    throw CardError.missingParam(['repo'], urlExample);
  }

  const repoOwner = parsedOwner || login;

  const res = await retryer(fetcher, { login: repoOwner, repo }, config);

  const { data } = res.data;

  if (!data.user && !data.organization) {
    throw new CardError('Not found', {
      code: 'not_found',
      secondaryMessage: REPO_NOT_FOUND,
    });
  }

  if (data.organization === null && data.user) {
    const { repository } = data.user;
    if (!repository || repository.isPrivate) {
      throw new CardError('User Repository Not found', {
        code: 'not_found',
        secondaryMessage: REPO_NOT_FOUND,
      });
    }
    const repoUserStats = await fetchRepoUserStats(
      {
        username: login,
        repo: [`${repoOwner}/${repo}`],
        include_prs_authored,
        include_prs_commented,
        include_prs_reviewed,
        include_issues_authored,
        include_issues_commented,
      },
      config,
    );
    return {
      ...repoUserStats,
      ...repository,
    };
  }

  if (data.user === null && data.organization) {
    const { repository } = data.organization;
    if (!repository || repository.isPrivate) {
      throw new CardError('Organization Repository Not found', {
        code: 'not_found',
        secondaryMessage: REPO_NOT_FOUND,
      });
    }
    const repoUserStats = await fetchRepoUserStats(
      {
        username: login,
        repo: [`${repoOwner}/${repo}`],
        include_prs_authored,
        include_prs_commented,
        include_prs_reviewed,
        include_issues_authored,
        include_issues_commented,
      },
      config,
    );
    return {
      ...repoUserStats,
      ...repository,
    };
  }

  throw new CardError('Unexpected behavior', { code: 'upstream' });
};

export { fetchRepo };
