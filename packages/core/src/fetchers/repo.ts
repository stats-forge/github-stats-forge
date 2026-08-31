import type { CardConfig } from "../common/config.js";
import { CardError } from "../common/error.js";
import { createGraphQLFetcher } from "../common/http.js";
import { retryer } from "../common/retryer.js";
import { GetRepoDocument } from "../graphql/generated/repo.js";

import { fetchRepoUserStats } from "./stats.js";
import type { RepositoryData } from "./types.js";

const fetcher = createGraphQLFetcher(GetRepoDocument, "token");

const urlExample = "/api/pin?username=USERNAME&repo=REPO_NAME";

/**
 * Fetch repository data.
 *
 * @param config Deployment config supplying the PAT pool.
 * @param username GitHub username.
 * @param reponame GitHub repository name.
 * @param include_prs_authored Include count of PRs authored.
 * @param include_prs_commented Include count of PRs commented.
 * @param include_prs_reviewed Include count of PRs reviewed.
 * @param include_issues_authored Include count of issues authored.
 * @param include_issues_commented Include count of issues commented.
 * @returns Repository data.
 */
const fetchRepo = async (
  config: CardConfig,
  username: string | undefined,
  reponame: string | undefined,
  include_prs_authored = false,
  include_prs_commented = false,
  include_prs_reviewed = false,
  include_issues_authored = false,
  include_issues_commented = false,
): Promise<RepositoryData> => {
  let owner = username;
  if (reponame && reponame.includes("/")) {
    const [parsedOwner, parsedRepo] = reponame.split("/");
    owner = parsedOwner ?? "";
    reponame = parsedRepo ?? "";
  }

  if (owner && !username) {
    username = owner;
  }
  if (username && !owner) {
    owner = username;
  }
  if (!username && !reponame) {
    throw CardError.missingParam(["username", "repo"], urlExample);
  }
  if (!username) {
    throw CardError.missingParam(["username"], urlExample);
  }
  if (!reponame) {
    throw CardError.missingParam(["repo"], urlExample);
  }

  // the guards above leave `username` set, and `owner` mirrors it when `repo` carried none
  const repoOwner = owner ?? username;

  const res = await retryer(
    fetcher,
    { login: repoOwner, repo: reponame },
    config,
  );

  const data = res.data.data;

  if (!data.user && !data.organization) {
    throw new Error("Not found");
  }

  if (data.organization === null && data.user) {
    const repository = data.user.repository;
    if (!repository || repository.isPrivate) {
      throw new Error("User Repository Not found");
    }
    const repoUserStats = await fetchRepoUserStats(
      username,
      [`${repoOwner}/${reponame}`],
      [],
      include_prs_authored,
      include_prs_commented,
      include_prs_reviewed,
      include_issues_authored,
      include_issues_commented,
      config,
    );
    return {
      ...repoUserStats,
      ...repository,
    };
  }

  if (data.user === null && data.organization) {
    const repository = data.organization.repository;
    if (!repository || repository.isPrivate) {
      throw new Error("Organization Repository Not found");
    }
    const repoUserStats = await fetchRepoUserStats(
      username,
      [`${repoOwner}/${reponame}`],
      [],
      include_prs_authored,
      include_prs_commented,
      include_prs_reviewed,
      include_issues_authored,
      include_issues_commented,
      config,
    );
    return {
      ...repoUserStats,
      ...repository,
    };
  }

  throw new Error("Unexpected behavior");
};

export { fetchRepo };
