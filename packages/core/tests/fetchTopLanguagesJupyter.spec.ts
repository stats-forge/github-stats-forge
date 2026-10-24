import { afterEach, describe, expect, it, vi } from 'vitest';

import { linguistLanguage } from '../src/common/languageAliases.ts';
import { getLanguageColor } from '../src/common/languageColors.ts';
import { MAX_NOTEBOOKS_PER_CARD, MAX_TREES_PER_CARD } from '../src/fetchers/jupyter.ts';
import type { GitTree } from '../src/fetchers/jupyter.ts';
import { fetchTopLanguages } from '../src/fetchers/top-languages.ts';
import type {
  TopLanguageFragment,
  TopLanguagesQuery,
  TopLanguagesRepositoryFragment,
} from '../src/graphql/generated/top-languages.ts';

import { testConfig } from './_config.ts';
import { FetchMock, GRAPHQL } from './_fetch-mock.ts';
import type { GraphQLBody, SearchBody } from './_fetch-mock.ts';

vi.mock(import('../src/common/log.ts'), async () => {
  const { createLoggerMock } = await import('./utils.ts');
  return createLoggerMock();
});

/** The part of nbformat 4 the recount reads. */
interface Notebook {
  metadata?: { kernelspec?: { name?: string; language?: string } };
  cells: Array<{
    cell_type: 'code' | 'markdown';
    source: string | Array<string>;
    metadata?: { vscode?: { languageId: string } };
    outputs?: Array<unknown>;
  }>;
}

/** nbformat 3: cells under worksheets, a code cell's source under `input` beside its language. */
interface Nbformat3Notebook {
  nbformat: 3;
  metadata: Record<string, never>;
  worksheets: Array<{
    cells: Array<
      | { cell_type: 'code'; language: string; input: Array<string> }
      | { cell_type: 'markdown'; source: string }
    >;
  }>;
}

const mock = new FetchMock();
const config = testConfig.with({ fetch: mock.fetch });

afterEach(() => {
  mock.reset();
});

const JUPYTER_COLOR = '#DA5B0B';

const treeUrl = (repo: string): string =>
  `https://api.github.com/repos/anuraghazra/${repo}/git/trees/HEAD?recursive=1`;
const TREE = treeUrl('notebooks');
const NOTEBOOK_SHA = 'a'.repeat(40);
const CHECKPOINT_SHA = 'b'.repeat(40);
const blobUrl = (sha: string): string =>
  `https://api.github.com/repos/anuraghazra/notebooks/git/blobs/${sha}`;
const BLOB = /\/git\/blobs\//;

const langsWith = (
  nodes: Array<TopLanguagesRepositoryFragment>,
): GraphQLBody<TopLanguagesQuery> => ({
  data: { user: { repositories: { nodes } } },
});

/** A repository GitHub says holds `jupyterBytes` of notebooks, plus any `others`. */
const notebookRepo = (
  name: string,
  jupyterBytes: number,
  ...others: Array<TopLanguageFragment>
): TopLanguagesRepositoryFragment => ({
  name,
  nameWithOwner: `anuraghazra/${name}`,
  languages: {
    edges: [
      { size: jupyterBytes, node: { color: JUPYTER_COLOR, name: 'Jupyter Notebook' } },
      ...others,
    ],
  },
});

const data_langs = (jupyterBytes = 5000): GraphQLBody<TopLanguagesQuery> =>
  langsWith([
    notebookRepo('notebooks', jupyterBytes, {
      size: 100,
      node: { color: '#3572A5', name: 'Python' },
    }),
  ]);

type TreeEntry = NonNullable<GitTree['tree']>[number];

const tree = (entries: Array<TreeEntry>): GitTree => ({ truncated: false, tree: entries });

/** `count` notebooks of `size` bytes each, every one with its own sha. */
const notebooks = (count: number, size: number): Array<TreeEntry> =>
  Array.from({ length: count }, (_, index) => ({
    path: `${String(index)}.ipynb`,
    type: 'blob',
    sha: index.toString(16).padStart(40, '0'),
    size,
  }));

const one_notebook_entries: Array<TreeEntry> = [
  { path: 'analysis.ipynb', type: 'blob', sha: NOTEBOOK_SHA, size: 5000 },
  // a checkpoint repeats its notebook; answering it would count the code twice
  {
    path: '.ipynb_checkpoints/analysis-checkpoint.ipynb',
    type: 'blob',
    sha: CHECKPOINT_SHA,
    size: 5000,
  },
  { path: 'README.md', type: 'blob', sha: 'c'.repeat(40), size: 10 },
];
const one_notebook = tree(one_notebook_entries);

/** Python by kernel, a `%%bash` cell, a VS Code JavaScript cell, a markdown cell and an output. */
const python_notebook: Notebook = {
  metadata: { kernelspec: { name: 'python3', language: 'python' } },
  cells: [
    { cell_type: 'markdown', source: '# Not code at all' },
    {
      cell_type: 'code',
      source: ['import pandas\n', 'df = 1'],
      outputs: [{ text: 'x'.repeat(900) }],
    },
    { cell_type: 'code', source: '%%bash\nls -la' },
    {
      cell_type: 'code',
      source: 'console.log(1)',
      metadata: { vscode: { languageId: 'javascript' } },
    },
    { cell_type: 'code', source: '' },
  ],
};

/** Five bytes of Python. */
const tiny_notebook: Notebook = {
  metadata: { kernelspec: { name: 'python3' } },
  cells: [{ cell_type: 'code', source: 'x = 1' }],
};

const fetchWithJupyter = (): ReturnType<typeof fetchTopLanguages> =>
  fetchTopLanguages({ username: 'anuraghazra', notebooks: 'code' }, config);

/** @returns Each language's size, which is what a recount changes. */
const sizes = (langs: Awaited<ReturnType<typeof fetchTopLanguages>>): Record<string, number> =>
  Object.fromEntries(Object.entries(langs).map(([name, { size }]) => [name, size]));

describe('fetchTopLanguages with notebooks', () => {
  it.each([undefined, 'github' as const])(
    'should leave notebooks alone given %s',
    async (count) => {
      mock.onPost(GRAPHQL).reply(200, data_langs());

      const langs = await fetchTopLanguages({ username: 'anuraghazra', notebooks: count }, config);

      expect(Object.keys(langs)).toStrictEqual(['Jupyter Notebook', 'Python']);
      expect(mock.history.get).toHaveLength(0);
    },
  );

  it("should count each code cell as its language, and nothing of a notebook's outputs", async () => {
    mock.onPost(GRAPHQL).reply(200, data_langs());
    mock.onGet(TREE).reply(200, one_notebook);
    mock.onGet(blobUrl(NOTEBOOK_SHA)).reply(200, python_notebook);

    const langs = await fetchWithJupyter();

    expect(langs).toStrictEqual({
      Python: { name: 'Python', color: '#3572A5', size: 100 + 20, count: 1 },
      Shell: { name: 'Shell', color: getLanguageColor('Shell'), size: 13, count: 1 },
      JavaScript: { name: 'JavaScript', color: getLanguageColor('JavaScript'), size: 14, count: 1 },
    });
    expect(mock.history.get.map(({ url }) => url)).toStrictEqual([TREE, blobUrl(NOTEBOOK_SHA)]);
  });

  it.each<[string, Notebook | Nbformat3Notebook, Record<string, number>]>([
    [
      'an nbformat 3 notebook, by its cells’ language',
      {
        nbformat: 3,
        metadata: {},
        worksheets: [
          {
            cells: [
              { cell_type: 'markdown', source: '# Not code' },
              { cell_type: 'code', language: 'python', input: ['import os\n', 'os.getcwd()'] },
            ],
          },
        ],
      },
      { Python: 100 + 21 },
    ],
    [
      'a versioned Julia kernel as Julia',
      {
        metadata: { kernelspec: { name: 'julia-1.9' } },
        cells: [{ cell_type: 'code', source: 'println(1)' }],
      },
      { Python: 100, Julia: 10 },
    ],
    [
      'an Octave kernel as MATLAB, as Linguist counts Octave',
      {
        metadata: { kernelspec: { name: 'octave' } },
        cells: [{ cell_type: 'code', source: 'disp(1)' }],
      },
      { Python: 100, MATLAB: 7 },
    ],
    [
      'nothing of a magic whose body is text',
      {
        metadata: { kernelspec: { name: 'python3' } },
        cells: [
          { cell_type: 'code', source: '%%latex\n$x^2$' },
          { cell_type: 'code', source: '%%writefile notes.txt\nhello' },
          { cell_type: 'code', source: 'x = 1' },
        ],
      },
      { Python: 100 + 5 },
    ],
    [
      "nothing of a cell in a language GitHub's bar leaves out",
      {
        metadata: { kernelspec: { name: 'python3' } },
        cells: [
          { cell_type: 'code', source: '%%sql\nSELECT 1' },
          { cell_type: 'code', source: 'SELECT 2', metadata: { vscode: { languageId: 'sql' } } },
          { cell_type: 'code', source: 'x = 1' },
        ],
      },
      { Python: 100 + 5 },
    ],
  ])('should count %s', async (_, notebook, expected) => {
    mock.onPost(GRAPHQL).reply(200, data_langs());
    mock.onGet(TREE).reply(200, one_notebook);
    mock.onGet(blobUrl(NOTEBOOK_SHA)).reply(200, notebook);

    expect(sizes(await fetchWithJupyter())).toStrictEqual(expected);
  });

  it.each([
    ['ipython', 'Python'],
    ['ir', 'R'],
    ['cxx', 'C++'],
    ['clojurescript', 'Clojure'],
  ])('should count a %s kernel, which Linguist does not name, as %s', async (kernel, language) => {
    mock.onPost(GRAPHQL).reply(200, data_langs());
    mock.onGet(TREE).reply(200, one_notebook);
    mock.onGet(blobUrl(NOTEBOOK_SHA)).reply(200, {
      metadata: { kernelspec: { name: kernel } },
      cells: [{ cell_type: 'code', source: 'code' }],
    } satisfies Notebook);

    expect(linguistLanguage(kernel)).toBeUndefined();
    expect(linguistLanguage(language)).toBe(language);
    expect(sizes(await fetchWithJupyter())[language]).toBe(language === 'Python' ? 100 + 4 : 4);
  });

  it("should keep an unknown kernel's code as Jupyter Notebook, in GitHub's color", async () => {
    mock.onPost(GRAPHQL).reply(200, data_langs());
    mock.onGet(TREE).reply(200, one_notebook);
    mock.onGet(blobUrl(NOTEBOOK_SHA)).reply(200, {
      metadata: { kernelspec: { name: 'no-such-kernel' } },
      cells: [{ cell_type: 'code', source: '+++.' }],
    } satisfies Notebook);

    const langs = await fetchWithJupyter();

    expect(langs['Jupyter Notebook']).toStrictEqual({
      name: 'Jupyter Notebook',
      color: JUPYTER_COLOR,
      size: 4,
      count: 1,
    });
  });

  it('should recount a repository whose checkpoints GitHub counted too', async () => {
    mock.onPost(GRAPHQL).reply(200, data_langs(5000 + 5000));
    mock.onGet(TREE).reply(200, one_notebook);
    mock.onGet(blobUrl(NOTEBOOK_SHA)).reply(200, tiny_notebook);

    expect(sizes(await fetchWithJupyter())).toStrictEqual({ Python: 100 + 5 });
    expect(mock.history.get.map(({ url }) => url)).toStrictEqual([TREE, blobUrl(NOTEBOOK_SHA)]);
  });

  it('should share the notebook budget across repositories, spending it on one that fails', async () => {
    const first = 20;
    const skipped = MAX_NOTEBOOKS_PER_CARD - first + 1;
    const last = MAX_NOTEBOOKS_PER_CARD - first;
    mock
      .onPost(GRAPHQL)
      .reply(
        200,
        langsWith([
          notebookRepo('failing', first * 10),
          notebookRepo('skipped', skipped * 10),
          notebookRepo('fitting', last * 10),
        ]),
      );
    mock.onGet(treeUrl('failing')).reply(200, tree(notebooks(first, 10)));
    mock.onGet(treeUrl('skipped')).reply(200, tree(notebooks(skipped, 10)));
    mock.onGet(treeUrl('fitting')).reply(200, tree(notebooks(last, 10)));
    mock.onGet(BLOB).reply(({ url }) => {
      if (url.includes('/failing/') && url.endsWith('0'.repeat(40))) {
        return [404, { message: 'Not Found' } satisfies SearchBody];
      }
      return [200, tiny_notebook];
    });

    const langs = await fetchWithJupyter();

    expect(sizes(langs)).toStrictEqual({
      'Jupyter Notebook': first * 10 + skipped * 10,
      Python: last * 5,
    });
    const blobs = mock.history.get.filter(({ url }) => url.includes('/git/blobs/'));
    // past its failure, the rest of the failing repository is not worth reading
    expect(blobs.filter(({ url }) => url.includes('/failing/')).length).toBeLessThan(first);
    expect(blobs.filter(({ url }) => url.includes('/skipped/'))).toHaveLength(0);
    expect(blobs.filter(({ url }) => url.includes('/fitting/'))).toHaveLength(last);
  });

  it(`should list the notebooks of at most ${String(MAX_TREES_PER_CARD)} repositories`, async () => {
    const names = Array.from({ length: MAX_TREES_PER_CARD + 1 }, (_, index) => `r${String(index)}`);
    mock.onPost(GRAPHQL).reply(200, langsWith(names.map((name) => notebookRepo(name, 10))));
    mock.onGet(/\/git\/trees\//).reply(200, tree(notebooks(1, 10)));
    mock.onGet(BLOB).reply(200, tiny_notebook);

    const langs = await fetchWithJupyter();

    expect(sizes(langs)).toStrictEqual({ Python: MAX_TREES_PER_CARD * 5, 'Jupyter Notebook': 10 });
    expect(mock.history.get.filter(({ url }) => url.includes('/git/trees/'))).toHaveLength(
      MAX_TREES_PER_CARD,
    );
  });

  it("should fail the card on the host's timeout, rather than keep GitHub's count", async () => {
    mock.onPost(GRAPHQL).reply(200, data_langs());
    mock.onGet(TREE).reply(200, one_notebook);
    mock.onGet(blobUrl(NOTEBOOK_SHA)).reply(() => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    });

    await expect(fetchWithJupyter()).rejects.toHaveProperty('name', 'TimeoutError');
  });

  it("should stop requesting once the host's timeout has failed the card", async () => {
    mock
      .onPost(GRAPHQL)
      .reply(200, langsWith([notebookRepo('notebooks', MAX_NOTEBOOKS_PER_CARD * 10)]));
    mock.onGet(TREE).reply(200, tree(notebooks(MAX_NOTEBOOKS_PER_CARD, 10)));
    mock.onGet(BLOB).reply(({ url }) => {
      if (url.endsWith('0'.repeat(40))) {
        throw new DOMException('The operation timed out.', 'TimeoutError');
      }
      return [200, tiny_notebook];
    });

    await expect(fetchWithJupyter()).rejects.toHaveProperty('name', 'TimeoutError');
    // the requests already in flight settle before the count
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    const blobs = mock.history.get.filter(({ url }) => url.includes('/git/blobs/'));
    expect(blobs.length).toBeLessThan(MAX_NOTEBOOKS_PER_CARD);
  });

  it.each(['anuraghazra/..', 'not_a_login/notebooks'])(
    'should never ask for %s, a repository GitHub could not have named',
    async (nameWithOwner) => {
      mock
        .onPost(GRAPHQL)
        .reply(200, langsWith([{ ...notebookRepo('notebooks', 5000), nameWithOwner }]));

      const langs = await fetchWithJupyter();

      expect(sizes(langs)).toStrictEqual({ 'Jupyter Notebook': 5000 });
      expect(mock.history.get).toHaveLength(0);
    },
  );

  const not_found = { message: 'Not Found' } satisfies SearchBody;
  // 25 notebooks of 192 bytes and one of 200 add up to GitHub's 5000
  const too_many = tree([
    ...notebooks(MAX_NOTEBOOKS_PER_CARD, 192),
    { path: 'last.ipynb', type: 'blob', sha: NOTEBOOK_SHA, size: 200 },
  ]);
  const TOO_LARGE = 3 * 1024 * 1024;
  const too_large = tree([{ path: 'a.ipynb', type: 'blob', sha: NOTEBOOK_SHA, size: TOO_LARGE }]);
  const with_one_skipped = tree([
    ...one_notebook_entries,
    { path: 'docs/tour.ipynb', type: 'blob', sha: 'd'.repeat(40), size: 700 },
  ]);

  /** GitHub's Jupyter bytes, what the tree answers, and the notebook when the recount gets that far. */
  interface Case {
    jupyter?: number;
    /** `{ tree: unknown }` stands for an answer that is not the shape GitHub documents. */
    tree: [number, GitTree | SearchBody | { tree: unknown }];
    blob?: [number, Partial<Notebook>];
  }

  it.each<[string, Case]>([
    ['the tree is truncated', { tree: [200, { truncated: true, tree: [] }] }],
    ['the tree cannot be read', { tree: [404, not_found] }],
    ['the tree is not a list', { tree: [200, { tree: {} }] }],
    ['an entry of the tree is not an object', { tree: [200, { tree: [null] }] }],
    ['a notebook is too large to be mostly code', { jupyter: TOO_LARGE, tree: [200, too_large] }],
    ['there are more notebooks than the card reads', { tree: [200, too_many] }],
    ['GitHub left a notebook in the tree out of its count', { tree: [200, with_one_skipped] }],
    ['a notebook cannot be read', { tree: [200, one_notebook], blob: [404, {}] }],
    ['a notebook is not one', { tree: [200, one_notebook], blob: [200, { metadata: {} }] }],
  ])("should keep GitHub's count when %s", async (_, { jupyter = 5000, tree: treeReply, blob }) => {
    mock.onPost(GRAPHQL).reply(200, data_langs(jupyter));
    mock.onGet(TREE).reply(...treeReply);
    if (blob) {
      mock.onGet(blobUrl(NOTEBOOK_SHA)).reply(...blob);
    }

    const langs = await fetchWithJupyter();

    expect(langs['Jupyter Notebook']?.size).toBe(jupyter);
    expect(langs['Python']?.size).toBe(100);
    expect(mock.history.get.map(({ url }) => url)).toStrictEqual(
      blob ? [TREE, blobUrl(NOTEBOOK_SHA)] : [TREE],
    );
  });
});
