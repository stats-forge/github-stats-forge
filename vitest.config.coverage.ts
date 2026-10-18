import { defineConfig, mergeConfig } from 'vitest/config';

import root from './vitest.config.ts';

export default mergeConfig(root, defineConfig({ test: { coverage: { enabled: true } } }));
