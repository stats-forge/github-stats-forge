import { describe, expect, it } from 'vitest';

import { calculateRank } from '../src/calculateRank.ts';

import { approxNumber } from './utils.ts';

/** What `calculateRank` reads, with nothing contributed. */
const NOBODY = {
  all_commits: false,
  commits: 0,
  prs: 0,
  issues: 0,
  reviews: 0,
  repos: 0,
  stars: 0,
  followers: 0,
};

describe(calculateRank, () => {
  it.each([
    ['a new user', {}, 'C', 100],
    [
      'a beginner',
      { commits: 125, prs: 25, issues: 10, reviews: 5, stars: 25, followers: 5 },
      'B-',
      65.02918514848255,
    ],
    [
      'the median user',
      { commits: 250, prs: 50, issues: 25, reviews: 10, stars: 50, followers: 10 },
      'B+',
      46.09375,
    ],
    [
      'the median user, counting all commits',
      {
        all_commits: true,
        commits: 1000,
        prs: 50,
        issues: 25,
        reviews: 10,
        stars: 50,
        followers: 10,
      },
      'B+',
      46.09375,
    ],
    [
      'an advanced user',
      { commits: 500, prs: 100, issues: 50, reviews: 20, stars: 200, followers: 40 },
      'A',
      20.841471354166664,
    ],
    [
      'an expert',
      { commits: 1000, prs: 200, issues: 100, reviews: 40, stars: 800, followers: 160 },
      'A+',
      5.575988339442828,
    ],
    [
      'sindresorhus',
      { commits: 1300, prs: 1500, issues: 4500, reviews: 1000, stars: 600_000, followers: 50_000 },
      'S',
      0.4578556547153667,
    ],
  ])('ranks %s', (_who, stats, level, percentile) => {
    expect(calculateRank({ ...NOBODY, ...stats })).toStrictEqual({
      level,
      percentile: approxNumber(percentile),
    });
  });
});
