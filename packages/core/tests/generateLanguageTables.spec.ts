import { describe, expect, it } from 'vitest';

import { buildLanguageTables, parseLanguages } from '../scripts/language-tables.ts';
import type { LinguistLanguage } from '../scripts/language-tables.ts';

describe(buildLanguageTables, () => {
  it('keeps every language, with or without a color', () => {
    const { colors } = buildLanguageTables({
      TypeScript: { type: 'programming', color: '#3178c6' },
      Text: { type: 'prose' },
    });

    expect(colors).toStrictEqual({ TypeScript: '#3178c6', Text: undefined });
  });

  it('points each name, alias and lone interpreter at a counted language, sorted', () => {
    const languages: Record<string, LinguistLanguage> = {
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
  it('reads a mapping of languages', () => {
    expect(parseLanguages('Python:\n  type: programming\n  color: "#3572A5"\n')).toStrictEqual({
      Python: { type: 'programming', color: '#3572A5' },
    } satisfies Record<string, LinguistLanguage>);
  });

  // an error page is valid YAML too, so these would otherwise reach the tables
  it.each([
    ['an error page', '404: Not Found'],
    ['a plain-text body', 'Internal Server Error'],
    ['a list', '- Python\n- Go\n'],
  ])('refuses %s', (_, yaml) => {
    expect(() => parseLanguages(yaml)).toThrow('languages.yml is not a mapping of language names');
  });

  it.each([
    ['malformed YAML', 'Python: [\n', 'deficient indentation'],
    ['an empty body', '', 'the input is empty'],
  ])('refuses %s', (_, yaml, error) => {
    expect(() => parseLanguages(yaml)).toThrow(error);
  });
});
