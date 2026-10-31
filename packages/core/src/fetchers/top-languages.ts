import type { CardConfig } from '../common/config.ts';
import { affiliationsOrOwner } from '../common/constants.ts';
import { CardError } from '../common/error.ts';
import { createGraphQLFetcher } from '../common/http.ts';
import { excludes } from '../common/ops.ts';
import { retryer } from '../common/retryer.ts';
import type { RepositoryAffiliation } from '../graphql/generated/common.ts';
import { TopLanguagesDocument } from '../graphql/generated/top-languages.ts';
import type {
  TopLanguageFragment,
  TopLanguagesRepositoryFragment,
} from '../graphql/generated/top-languages.ts';

import { withNotebooksRecounted } from './jupyter.ts';
import type { NOTEBOOK_COUNTS } from './jupyter.ts';
import type { Lang, TopLangData } from './types.ts';

const fetcher = createGraphQLFetcher(TopLanguagesDocument);

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
    notebooks,
  }: {
    username: string | undefined;
    exclude_repo?: Array<string>;
    size_weight?: number | undefined;
    count_weight?: number | undefined;
    /** Empty counts the user's own repositories alone. */
    ownerAffiliations?: Array<RepositoryAffiliation>;
    /** `code` recounts each repository's notebooks by the language of their code cells. */
    notebooks?: (typeof NOTEBOOK_COUNTS)[number] | undefined;
  },
  config: CardConfig,
): Promise<TopLangData> => {
  if (!username) {
    throw CardError.because('missing_param', { params: ['username'] });
  }
  const affiliations = affiliationsOrOwner(ownerAffiliations);

  const res = await retryer(
    fetcher,
    {
      login: username,
      ownerAffiliations: affiliations,
    },
    config,
  );

  if (res.data.errors) {
    throw CardError.fromGraphQL(res.data.errors, res.statusText, 'language data');
  }

  const isExcluded = excludes([...exclude_repo, ...config.excludeRepositories]);
  const repoEdges = (res.data.data.user?.repositories.nodes ?? [])
    .filter(
      (node): node is TopLanguagesRepositoryFragment => !!node && !isExcluded(node.nameWithOwner),
    )
    .map(({ nameWithOwner, languages }) => ({
      nameWithOwner,
      edges: (languages?.edges ?? []).filter((edge): edge is TopLanguageFragment => !!edge),
    }));
  const repositories =
    notebooks === 'code' ? await withNotebooksRecounted(repoEdges, config) : repoEdges;

  const languageEdges: Array<TopLanguageFragment> = [];
  for (const { edges } of repositories) {
    if (edges.length > 0) {
      languageEdges.unshift(...edges);
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
