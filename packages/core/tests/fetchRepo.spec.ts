import { afterEach, describe, expect, it } from 'vitest';

import { fetchRepo } from '../src/fetchers/repo.ts';

import { testConfig } from './_config.ts';
import { FetchMock, GRAPHQL } from './_fetch-mock.ts';

const data_repo = {
  repository: {
    name: 'convoychat',
    stargazerCount: 38_000,
    description: 'Help us take over the world! React + TS + GraphQL Chat App',
    primaryLanguage: {
      color: '#2b7489',
      id: 'MDg6TGFuZ3VhZ2UyODc=',
      name: 'TypeScript',
    },
    forkCount: 100,
  },
};

const data_user = {
  data: {
    user: { repository: data_repo.repository },
    organization: null,
  },
};

const data_org = {
  data: {
    user: null,
    organization: { repository: data_repo.repository },
  },
};

const mock = new FetchMock();
const config = testConfig.with({ fetch: mock.fetch });

afterEach(() => {
  mock.reset();
});

describe('Test fetchRepo', () => {
  it('should fetch correct user repo', async () => {
    mock.onPost(GRAPHQL).reply(200, data_user);

    const repo = await fetchRepo({ username: 'anuraghazra', reponame: 'convoychat' }, config);

    expect(repo).toStrictEqual(data_repo.repository);
  });

  it('should fetch correct org repo', async () => {
    mock.onPost(GRAPHQL).reply(200, data_org);

    const repo = await fetchRepo({ username: 'anuraghazra', reponame: 'convoychat' }, config);
    expect(repo).toStrictEqual(data_repo.repository);
  });

  it.each([
    ['repo', { username: 'anuraghazra', reponame: undefined }],
    ['repo', { username: 'anuraghazra', reponame: 'anuraghazra/' }],
    ['username', { username: undefined, reponame: 'convoychat' }],
  ])('should report a missing %s as a missing param (%o)', async (param, options) => {
    await expect(fetchRepo(options, config)).rejects.toMatchObject({
      code: 'missing_param',
      param,
    });
    expect(mock.history.post).toHaveLength(0);
  });

  it.each([
    ['the user has no such repository', { user: { repository: null }, organization: null }],
    ['the organization has no such repository', { user: null, organization: { repository: null } }],
    ['the login is neither a user nor an organization', { user: null, organization: null }],
    [
      'the repository is private',
      { user: { repository: { ...data_repo.repository, isPrivate: true } }, organization: null },
    ],
  ])('should report the repository not found when %s', async (_case, data) => {
    mock.onPost(GRAPHQL).reply(200, { data });

    await expect(
      fetchRepo({ username: 'anuraghazra', reponame: 'convoychat' }, config),
    ).rejects.toMatchObject({ reason: 'repo_not_found' });
  });
});
