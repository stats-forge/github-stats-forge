import { screen } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';

import { pin } from '../src/api/pin.ts';
import { fetchRepo } from '../src/fetchers/repo.ts';
import type { GetRepoQuery, RepoInfoFragment } from '../src/graphql/generated/repo.ts';

import { draw, exactly } from './_card.ts';
import { testConfig } from './_config.ts';
import { FetchMock, GRAPHQL } from './_fetch-mock.ts';
import type { GraphQLBody } from './_fetch-mock.ts';

const repository: RepoInfoFragment = {
  name: 'convoychat',
  nameWithOwner: 'anuraghazra/convoychat',
  isPrivate: false,
  isArchived: false,
  isTemplate: false,
  stargazerCount: 38_000,
  description: 'Help us take over the world! React + TS + GraphQL Chat App',
  primaryLanguage: { color: '#2b7489', id: 'MDg6TGFuZ3VhZ2UyODc=', name: 'TypeScript' },
  forkCount: 100,
};

const data_user: GraphQLBody<GetRepoQuery> = {
  data: { user: { repository }, organization: null },
};

const data_org: GraphQLBody<GetRepoQuery> = {
  data: { user: null, organization: { repository } },
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

    expect(repo).toStrictEqual(repository);
  });

  it('should fetch correct org repo', async () => {
    mock.onPost(GRAPHQL).reply(200, data_org);

    const repo = await fetchRepo({ username: 'anuraghazra', reponame: 'convoychat' }, config);
    expect(repo).toStrictEqual(repository);
  });

  it('should ask for no topics unless told to', async () => {
    mock.onPost(GRAPHQL).reply(200, data_user);

    await fetchRepo({ username: 'anuraghazra', reponame: 'convoychat' }, config);

    expect(JSON.parse(mock.history.post[0]?.data ?? '{}')).toMatchObject({
      variables: { includeTopics: false },
    });
  });

  it('should flatten the topics to their names when told to fetch them', async () => {
    const repositoryTopics = {
      nodes: [{ topic: { name: 'chat' } }, null, { topic: { name: 'react' } }],
    };
    mock.onPost(GRAPHQL).reply(200, {
      data: { user: { repository: { ...repository, repositoryTopics } }, organization: null },
    });

    const repo = await fetchRepo(
      { username: 'anuraghazra', reponame: 'convoychat', include_topics: true },
      config,
    );

    expect(JSON.parse(mock.history.post[0]?.data ?? '{}')).toMatchObject({
      variables: { includeTopics: true },
    });
    expect(repo).toStrictEqual({ ...repository, topics: ['chat', 'react'] });
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
      { user: { repository: { ...repository, isPrivate: true } }, organization: null },
    ],
  ] satisfies Array<[string, GetRepoQuery]>)(
    'should report the repository not found when %s',
    async (_case, data) => {
      mock.onPost(GRAPHQL).reply(200, { data });

      await expect(
        fetchRepo({ username: 'anuraghazra', reponame: 'convoychat' }, config),
      ).rejects.toMatchObject({ reason: 'repo_not_found' });
    },
  );
});

describe('the pin endpoint', () => {
  it('hands the fetcher and the card their own params', async () => {
    const repositoryTopics = { nodes: [{ topic: { name: 'chat' } }] };
    mock.onPost(GRAPHQL).reply(200, {
      data: { user: { repository: { ...repository, repositoryTopics } }, organization: null },
    } satisfies GraphQLBody<GetRepoQuery>);

    const result = await pin(
      { username: 'anuraghazra', repo: 'convoychat', show: 'topics', show_owner: 'true' },
      config,
    );

    expect(result.status).toBe('success');
    // show reaches both the fetcher and the card; show_owner reaches the card
    expect(JSON.parse(mock.history.post[0]?.data ?? '{}')).toMatchObject({
      variables: { includeTopics: true },
    });
    draw(result.content);
    expect(screen.getAllByTestId('topic')).toHaveLength(1);
    expect(document.querySelector('.header')).toHaveTextContent(exactly('anuraghazra/convoychat'));
  });
});
