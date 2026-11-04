import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import type { Loader } from 'astro/loaders';
import { defineCollection } from 'astro:content';

import { isExcludedWhenSelfHosted } from './constants.ts';

const starlightLoader = docsLoader();

/** Starlight's loader, less the pages excluded when self-hosted. */
const loader: Loader = {
  ...starlightLoader,
  // refused at `set` rather than deleted after `load`, which dev's watcher would undo on an edit
  load: async (context) =>
    starlightLoader.load({
      ...context,
      store: {
        ...context.store,
        set: (entry) => !isExcludedWhenSelfHosted(entry.id) && context.store.set(entry),
      },
    }),
};

export const collections = {
  docs: defineCollection({ loader, schema: docsSchema() }),
};
