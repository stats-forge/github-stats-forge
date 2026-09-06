import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLinksValidator from 'starlight-links-validator';

import { BASE } from './src/constants.ts';
import { rehypeCardPreviews } from './src/plugins/rehype-card-previews.ts';
import { remarkFetcherReference } from './src/plugins/remark-fetcher-reference.ts';
import { remarkResolveLinks } from './src/plugins/remark-resolve-links.ts';

export default defineConfig({
  site: 'https://stats-forge.github.io',
  base: BASE,
  outDir: './build',
  markdown: {
    // Starlight appends its own plugins to whatever processor is configured here.
    processor: unified({
      remarkPlugins: [remarkFetcherReference, remarkResolveLinks],
      rehypePlugins: [rehypeCardPreviews],
    }),
  },
  integrations: [
    starlight({
      title: 'GitHub Stats Forge',
      description: 'Dynamically generate GitHub stats cards for your READMEs.',
      // The repository's own icon, not a copy of it: the README shows the same file.
      logo: { src: '../../.github/assets/appIcon.svg', alt: '' },
      customCss: [
        './src/styles/card-previews.css',
        './src/styles/precedence.css',
        './src/styles/home.css',
      ],
      components: {
        // Starlight has no top navigation; this override puts the two halves beside the title.
        SiteTitle: './src/components/SiteTitle.astro',
        // The same icons, opening in a new tab.
        SocialIcons: './src/components/SocialIcons.astro',
      },
      // The pages link to each other by path, so a rename has to fail the build.
      plugins: [
        // At its defaults: `remark-resolve-links` has already turned every relative link into
        // the URL it means, so there is nothing left for the plugin to skip.
        starlightLinksValidator(),
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/stats-forge/github-stats-forge',
        },
        {
          icon: 'npm',
          label: 'npm',
          href: 'https://www.npmjs.com/org/stats-forge',
        },
      ],
      sidebar: [
        { label: 'Overview', link: '/docs/' },
        {
          label: 'Cards',
          items: [
            'docs/cards/stats',
            'docs/cards/top-languages',
            'docs/cards/contributed-to',
            'docs/cards/repo-pin',
            'docs/cards/gist-pin',
            'docs/cards/wakatime',
          ],
        },
        {
          label: 'Customization',
          items: [
            'docs/customization/common-options',
            'docs/customization/themes',
            'docs/customization/light-and-dark',
            'docs/customization/locales',
            'docs/customization/aligning-cards',
          ],
        },
        {
          label: 'Using it',
          items: ['docs/usage/cli', 'docs/usage/in-your-readme', 'docs/usage/library'],
        },
        {
          label: 'Fetchers',
          items: [
            'docs/fetchers/overview',
            'docs/fetchers/fetch-stats',
            'docs/fetchers/fetch-top-languages',
            'docs/fetchers/fetch-repo',
            'docs/fetchers/fetch-contributed-to',
            'docs/fetchers/fetch-gist',
            'docs/fetchers/fetch-wakatime-stats',
            'docs/fetchers/fetch-repo-user-stats',
          ],
        },
      ],
    }),
  ],
});
