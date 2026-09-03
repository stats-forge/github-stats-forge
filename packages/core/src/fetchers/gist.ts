import type { CardConfig } from '../common/config.js';
import { CardError, GIST_NOT_FOUND } from '../common/error.js';
import { createGraphQLFetcher } from '../common/http.js';
import { retryer } from '../common/retryer.js';
import { GistInfoDocument } from '../graphql/generated/gist.js';
import type { GistFileInfoFragment } from '../graphql/generated/gist.js';

import type { GistData } from './types.js';

const fetcher = createGraphQLFetcher(GistInfoDocument, 'token');

/**
 * This function calculates the primary language of a gist by files size.
 *
 * @returns Primary language, or `null` when no file has a language.
 */
const calculatePrimaryLanguage = (files: Array<GistFileInfoFragment>): string | null => {
  const languages: Record<string, number> = {};

  for (const file of files) {
    if (file.language) {
      languages[file.language.name] = (languages[file.language.name] ?? 0) + (file.size ?? 0);
    }
  }

  let primaryLanguage: string | null = null;
  let maxSize = -1;
  for (const [language, size] of Object.entries(languages)) {
    if (size > maxSize) {
      maxSize = size;
      primaryLanguage = language;
    }
  }

  return primaryLanguage;
};

/**
 * Fetch GitHub gist information by given username and ID.
 *
 * @returns Gist data.
 */
const fetchGist = async (
  { id }: { id: string | undefined },
  config: CardConfig,
): Promise<GistData> => {
  if (!id) {
    throw CardError.missingParam(['id'], '/api/gist?id=GIST_ID');
  }
  const res = await retryer(fetcher, { gistName: id }, config);
  if (res.data.errors) {
    throw new CardError(res.data.errors[0]?.message ?? 'Could not fetch gist.', {
      code: 'upstream',
    });
  }
  const { gist } = res.data.data.viewer;
  if (!gist) {
    throw new CardError('Gist not found', {
      code: 'not_found',
      secondaryMessage: GIST_NOT_FOUND,
    });
  }
  const firstFile = gist.files?.[0];
  if (!firstFile?.name) {
    // A gist with nothing to render will not gain a file on a retry.
    throw new CardError('Gist has no files', { code: 'not_found' });
  }
  return {
    name: firstFile.name,
    nameWithOwner: `${gist.owner?.login ?? ''}/${firstFile.name}`,
    description: gist.description,
    language: calculatePrimaryLanguage(gist.files?.filter((file) => !!file) ?? []),
    starsCount: gist.stargazerCount,
    forksCount: gist.forks.totalCount,
  };
};

export { fetchGist };
