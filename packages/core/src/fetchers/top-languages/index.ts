import type { CardConfig } from '../../common/config.ts';
import { affiliationsOrOwner } from '../../common/constants.ts';
import { CardError, fromGraphQL } from '../../common/error.ts';
import { createGraphQLFetcher } from '../../common/http.ts';
import type { GraphQLResponse } from '../../common/http.ts';
import { excludes } from '../../common/ops.ts';
import { retryer } from '../../common/retryer.ts';
import type { RepositoryAffiliation } from '../../graphql/generated/common.ts';
import { TopLanguagesDocument } from '../../graphql/generated/top-languages.ts';
import type { TopLanguagesQuery } from '../../graphql/generated/top-languages.ts';

import { withNotebooksRecounted } from './jupyter.ts';
import type { NOTEBOOK_COUNTS, RepositoryLanguages } from './jupyter.ts';
import type { Lang, TopLangData } from './types.ts';

const fetcher = createGraphQLFetcher(TopLanguagesDocument);

/** Pages of 100, GitHub's most per request: the card counts the 1000 most recently pushed. */
const MAX_PAGES = 10;

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

  const isExcluded = excludes([...exclude_repo, ...config.excludeRepositories]);
  const repoEdges: Array<RepositoryLanguages> = [];
  let after: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    // annotated: the cursor fed back in reads as circular
    const res: GraphQLResponse<TopLanguagesQuery> = await retryer(
      fetcher,
      { login: username, ownerAffiliations: affiliations, after },
      config,
    );
    if (res.data.errors) {
      throw fromGraphQL(res.data.errors, res.statusText, 'language data', config.logger);
    }

    const repositories = res.data.data.user?.repositories;
    for (const node of repositories?.nodes ?? []) {
      if (node && !isExcluded(node.nameWithOwner)) {
        repoEdges.push({
          nameWithOwner: node.nameWithOwner,
          edges: (node.languages?.edges ?? []).filter((edge) => edge !== null),
        });
      }
    }
    if (!repositories?.pageInfo.hasNextPage) {
      break;
    }
    after = repositories.pageInfo.endCursor;
  }

  const repositories =
    notebooks === 'code' ? await withNotebooksRecounted(repoEdges, config) : repoEdges;

  const languageEdges = repositories.toReversed().flatMap(({ edges }) => edges);

  // accumulate bytes and repo count per language, each read back off the language's own entry
  const languageMap: Record<string, Omit<Lang, 'size'>> = {};
  for (const edge of languageEdges) {
    const existing = languageMap[edge.node.name];
    languageMap[edge.node.name] = {
      name: edge.node.name,
      color: edge.node.color,
      bytes: edge.size + (existing?.bytes ?? 0),
      count: (existing?.count ?? 0) + 1,
    };
  }

  const langs = Object.values(languageMap).map((lang) => ({
    ...lang,
    size: lang.bytes ** size_weight * lang.count ** count_weight,
  }));
  return Object.fromEntries(
    langs.toSorted((a, b) => b.size - a.size).map((lang) => [lang.name, lang]),
  );
};

export { fetchTopLanguages };
