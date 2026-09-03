import type { CardConfig } from '../common/config.js';
import { CardError, USER_NOT_FOUND } from '../common/error.js';
import { createGraphQLFetcher } from '../common/http.js';
import { logger } from '../common/log.js';
import { parseOwnerAffiliations } from '../common/ops.js';
import { wrapTextMultiline } from '../common/render.js';
import { retryer } from '../common/retryer.js';
import { TopLanguagesDocument } from '../graphql/generated/top-languages.js';
import type {
  TopLanguageFragment,
  TopLanguagesRepositoryFragment,
} from '../graphql/generated/top-languages.js';

import type { Lang, TopLangData } from './types.js';

const fetcher = createGraphQLFetcher(TopLanguagesDocument, 'token');

/**
 * Fetch top languages for a given username.
 *
 * @param props Fetcher props.
 * @param props.username GitHub username.
 * @param props.exclude_repo List of repositories to exclude. Default: [].
 * @param props.size_weight Weightage to be given to size.
 * @param props.count_weight Weightage to be given to count.
 * @param props.ownerAffiliations The owner affiliations to filter by. Default: OWNER.
 * @param config Deployment config supplying the PAT pool.
 * @returns Top languages data.
 */
const fetchTopLanguages = async (
  {
    username,
    exclude_repo = [],
    size_weight = 1,
    count_weight = 0,
    ownerAffiliations = [],
  }: {
    username: string | undefined;
    exclude_repo?: Array<string>;
    size_weight?: number | undefined;
    count_weight?: number | undefined;
    ownerAffiliations?: Array<string>;
  },
  config: CardConfig,
): Promise<TopLangData> => {
  if (!username) {
    throw CardError.missingParam(['username']);
  }
  const affiliations = parseOwnerAffiliations(ownerAffiliations);

  const res = await retryer(
    fetcher,
    {
      login: username,
      ownerAffiliations: affiliations,
    },
    config,
  );

  if (res.data.errors) {
    logger.error(res.data.errors);
    const firstError = res.data.errors[0];
    if (firstError?.type === 'NOT_FOUND') {
      throw new CardError(firstError.message || 'Could not fetch user.', {
        code: 'not_found',
        secondaryMessage: USER_NOT_FOUND,
      });
    }
    if (firstError?.message) {
      throw new CardError(wrapTextMultiline(firstError.message, 525, 12)[0] ?? '', {
        code: 'upstream',
        secondaryMessage: res.statusText,
      });
    }
    throw new CardError(
      'Something went wrong while trying to retrieve the language data using the GraphQL API.',
      { code: 'upstream' },
    );
  }

  const repoToHide: Record<string, boolean> = {};
  const allExcludedRepos = [...exclude_repo, ...config.excludeRepositories];

  // populate repoToHide map for quick lookup while filtering out
  allExcludedRepos.forEach((repoName) => {
    repoToHide[repoName] = true;
  });

  // filter out repositories to be hidden
  const repoNodes = (res.data.data.user?.repositories.nodes ?? []).filter(
    (node): node is TopLanguagesRepositoryFragment => !!node && !repoToHide[node.name],
  );

  const languageEdges = repoNodes.reduce<Array<TopLanguageFragment>>((acc, repo) => {
    const edges = (repo.languages?.edges ?? []).filter(
      (edge): edge is TopLanguageFragment => !!edge,
    );
    return edges.length > 0 ? edges.concat(acc) : acc;
  }, []);

  // accumulate size and repo count per language, each read back off the language's own entry
  const languageMap: Record<string, Lang> = {};
  for (const edge of languageEdges) {
    const existing = languageMap[edge.node.name];
    languageMap[edge.node.name] = {
      name: edge.node.name,
      color: edge.node.color,
      size: edge.size + (existing?.size ?? 0),
      count: (existing?.count ?? 0) + 1,
    };
  }

  // comparison index calculation
  for (const lang of Object.values(languageMap)) {
    lang.size = Math.pow(lang.size, size_weight) * Math.pow(lang.count, count_weight);
  }

  // return languages sorted by (weighted) size, descending
  return Object.fromEntries(Object.entries(languageMap).sort(([, a], [, b]) => b.size - a.size));
};

export { fetchTopLanguages };
