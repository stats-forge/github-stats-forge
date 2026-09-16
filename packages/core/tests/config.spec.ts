/**
 * @file What `CardConfig.fromEnv` takes from an environment it does not own, a container's
 * being shared with whatever else runs beside it.
 */

import { describe, expect, it } from 'vitest';

import { CardConfig } from '../src/common/config.ts';

describe('CardConfig.fromEnv', () => {
  it('reads the PAT_n names the CLI and the compose file write', () => {
    const config = CardConfig.fromEnv({ PAT_1: 'one', PAT_2: 'two', HOME: '/somewhere' });

    expect(config.pats).toStrictEqual([
      { name: 'PAT_1', value: 'one' },
      { name: 'PAT_2', value: 'two' },
    ]);
  });

  it('orders by name, whatever order the environment happens to hold them in', () => {
    const config = CardConfig.fromEnv({ PAT_3: 'three', PAT_1: 'one', PAT_2: 'two' });

    expect(config.pats.map((pat) => pat.name)).toStrictEqual(['PAT_1', 'PAT_2', 'PAT_3']);
  });

  it('skips an empty variable, docker compose writing `PAT_2=` for a blank token', () => {
    const config = CardConfig.fromEnv({ PAT_1: 'one', PAT_2: '' });

    expect(config.pats).toStrictEqual([{ name: 'PAT_1', value: 'one' }]);
  });

  it("leaves a neighbour's token alone, whatever it is suffixed with", () => {
    const config = CardConfig.fromEnv({
      PAT: 'x',
      PAT_: 'y',
      PAT_ONE: 'z',
      MY_PAT_1: 'mine',
      AZURE_PAT_1: 'azure',
      GH_PAT_1: 'gh',
    });

    expect(config.pats).toStrictEqual([]);
  });
});
