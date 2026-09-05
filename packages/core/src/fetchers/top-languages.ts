import type { CardConfig } from '../common/config.ts';
import { CardError } from '../common/error.ts';
import { createGraphQLFetcher } from '../common/http.ts';
import { parseOwnerAffiliations } from '../common/ops.ts';
import { retryer } from '../common/retryer.ts';
import { TopLanguagesDocument } from '../graphql/generated/top-languages.ts';
import type {
  TopLanguageFragment,
  TopLanguagesRepositoryFragment,
} from '../graphql/generated/top-languages.ts';

import { graphqlError } from './graphql-error.ts';
import type { Lang, TopLangData } from './types.ts';

const fetcher = createGraphQLFetcher(TopLanguagesDocument, 'token');

/**
 * Fetch top languages for a given username.
 *
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
    throw graphqlError(
      res.data.errors,
      res.statusText,
      'Something went wrong while trying to retrieve the language data using the GraphQL API.',
    );
  }

  const repoToHide: Record<string, boolean> = {};
  const allExcludedRepos = [...exclude_repo, ...config.excludeRepositories];

  // populate repoToHide map for quick lookup while filtering out
  for (const repoName of allExcludedRepos) {
    repoToHide[repoName] = true;
  }

  // filter out repositories to be hidden
  const repoNodes = (res.data.data.user?.repositories.nodes ?? []).filter(
    (node): node is TopLanguagesRepositoryFragment => !!node && !repoToHide[node.name],
  );

  let languageEdges: Array<TopLanguageFragment> = [];
  for (const repo of repoNodes) {
    const edges = (repo.languages?.edges ?? []).filter(
      (edge): edge is TopLanguageFragment => !!edge,
    );
    if (edges.length > 0) {
      languageEdges = [...edges, ...languageEdges];
    }
  }

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
    lang.size = lang.size ** size_weight * lang.count ** count_weight;
  }

  // return languages sorted by (weighted) size, descending
  return Object.fromEntries(
    Object.entries(languageMap).toSorted(([, a], [, b]) => b.size - a.size),
  );
};

export { fetchTopLanguages };
