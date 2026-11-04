import type { RepoInfoFragment } from '../../graphql/generated/repo.ts';
import type { RepoUserStats } from '../stats/types.ts';

/**
 * What the repo query returns, with `primaryLanguage` loosened and the topics flattened:
 * the schema says `name` is non-null, but the card falls back to defaults for callers passing untyped data.
 */
type RepoInfo = Omit<RepoInfoFragment, 'primaryLanguage' | 'repositoryTopics'> & {
  primaryLanguage: {
    color: string | null;
    id?: string;
    name: string | null;
  } | null;
  /** The topics' names, in GitHub's order; only present when `include_topics` is set. */
  topics?: Array<string>;
};

export type RepositoryData = RepoInfo & RepoUserStats;
