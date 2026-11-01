import { describe, expect, it } from 'vitest';

import { buildLanguageTables, parseLanguages } from '../scripts/language-tables.ts';
import type { LinguistLanguages } from '../scripts/language-tables.ts';

describe(buildLanguageTables, () => {
  it('keeps every language, with or without a color', () => {
    const { colors } = buildLanguageTables({
      TypeScript: { type: 'programming', color: '#3178c6' },
      Text: { type: 'prose' },
    });

    expect(colors).toStrictEqual({ TypeScript: '#3178c6', Text: undefined });
  });

  it('points each name, alias and lone interpreter at a counted language, sorted', () => {
    const languages: LinguistLanguages = {
      Shell: { type: 'programming', aliases: ['sh'], interpreters: ['bash'] },
      JSON: { type: 'data', aliases: ['geojson'] },
      Python: { type: 'programming', interpreters: ['python3', 'shared', 'sh'] },
      Starlark: { type: 'programming', interpreters: ['shared'] },
    };

    // `sh` stays Shell's alias, `shared` names two languages so neither, and a data language
    // is one GitHub's bar leaves out
    expect(Object.entries(buildLanguageTables(languages).aliases)).toStrictEqual([
      ['bash', 'Shell'],
      ['geojson', null],
      ['json', null],
      ['python', 'Python'],
      ['python3', 'Python'],
      ['sh', 'Shell'],
      ['shell', 'Shell'],
      ['starlark', 'Starlark'],
    ]);
  });

  it.each([
    {
      what: 'two names differing in case',
      languages: { Foo: { color: '#000' }, foo: { color: '#fff' } },
      error: 'Name or alias "foo" is claimed twice, the second time by "foo"',
    },
    {
      what: 'an alias another language claims',
      languages: { C: { aliases: ['h'] }, 'C++': { aliases: ['H'] } },
      error: 'Name or alias "H" is claimed twice, the second time by "C++"',
    },
  ])('refuses $what', ({ languages, error }) => {
    expect(() => buildLanguageTables(languages)).toThrow(error);
  });
});

describe(parseLanguages, () => {
  it('reads a mapping of languages, dropping the fields the tables do not read', () => {
    const yaml = 'Python:\n  type: programming\n  color: "#3572A5"\n  extensions: [".py"]\n';

    expect(parseLanguages(yaml)).toStrictEqual({
      Python: { type: 'programming', color: '#3572A5' },
    } satisfies LinguistLanguages);
  });

  const notATable = 'languages.yml is not a table of languages';

  // js-yaml refuses the last two itself, before the schema sees them
  it.each([
    ['an error page, which is valid YAML', '404: Not Found', notATable],
    ['a list', '- Python\n- Go\n', notATable],
    ['an alias that is not a list', 'Python:\n  aliases: py\n', notATable],
    ['malformed YAML', 'Python: [\n', 'deficient indentation'],
    ['an empty body', '', 'the input is empty'],
  ])('refuses %s', (_, yaml, error) => {
    expect(() => parseLanguages(yaml)).toThrow(error);
  });
});
