import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLinksValidator from 'starlight-links-validator';

import { BASE, PAGES_SITE, SERVED_BY_INSTANCE } from './src/constants.ts';
import { rehypeCardPreviews } from './src/plugins/rehype-card-previews.ts';
import { remarkCliDemo } from './src/plugins/remark-cli-demo.ts';
import { remarkFetcherReference } from './src/plugins/remark-fetcher-reference.ts';
import { remarkResolveLinks } from './src/plugins/remark-resolve-links.ts';

// one file is both the favicon and the header logo; the amber twin is what an instance wears
const icon = SERVED_BY_INSTANCE ? 'favicon-self-hosted.svg' : 'favicon.svg';

export default defineConfig({
  // Pages stays canonical even when the image serves a copy; `Head.astro` adds the base it lacks
  site: PAGES_SITE,
  // `BASE` is empty at the root, which astro spells `/`
  base: BASE || '/',
  outDir: './build',
  vite: {
    /*
     * The anvil bundles `packages/core` and the CLI's card catalog from their `src/`, through
     * `@stats/source`, so the docs job runs with nothing built. `ssr` has to say it too — a
     * condition set only under `resolve` is not applied to the server build.
     */
    resolve: { conditions: ['@stats/source'] },
    ssr: { resolve: { conditions: ['@stats/source'] } },
  },
  markdown: {
    // Starlight appends its own plugins to whatever processor is configured here.
    processor: unified({
      remarkPlugins: [remarkCliDemo, remarkFetcherReference, remarkResolveLinks],
      rehypePlugins: [rehypeCardPreviews],
    }),
  },
  integrations: [
    starlight({
      title: 'GitHub Stats Forge',
      description: 'Dynamically generate GitHub stats cards for your READMEs.',
      logo: { src: `./public/${icon}`, alt: '' },
      favicon: `/${icon}`,
      customCss: [
        './src/styles/card-previews.css',
        './src/styles/cli-demo.css',
        './src/styles/precedence.css',
        './src/styles/home.css',
      ],
      components: {
        // Starlight emits every Open Graph tag but the image; this override adds it.
        Head: './src/components/Head.astro',
        // The section a card page sits in, above its title — Starlight has no breadcrumb.
        PageTitle: './src/components/PageTitle.astro',
        // Starlight has no top navigation; this override puts the two halves beside the title.
        SiteTitle: './src/components/SiteTitle.astro',
        // The same icons, opening in a new tab.
        SocialIcons: './src/components/SocialIcons.astro',
        // Says nothing unless an instance is serving the site.
        Banner: './src/components/Banner.astro',
      },
      plugins: [starlightLinksValidator()],
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
          // The anvil's own headings, in its order: what the card is about. A group is left
          // expanded, which is Starlight's default, so the categories cost indentation and no click.
          items: [
            {
              label: 'User',
              items: [
                'docs/cards/stats',
                'docs/cards/top-languages',
                'docs/cards/contributed-to',
                'docs/cards/wakatime',
              ],
            },
            {
              label: 'Repository or gist',
              items: ['docs/cards/repo-pin', 'docs/cards/gist-pin'],
            },
            {
              label: 'Organization',
              items: ['docs/cards/organization'],
            },
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
          items: [
            'docs/usage/cli',
            'docs/usage/in-your-readme',
            'docs/usage/library',
            'docs/usage/self-hosting',
          ],
        },
        {
          label: 'Fetchers',
          // Reference for a library consumer, not for someone putting a card in a README — and
          // nine of the sidebar's twenty-six links. Folded, so the cards stay in one screen.
          collapsed: true,
          items: [
            'docs/fetchers/overview',
            'docs/fetchers/fetch-stats',
            'docs/fetchers/fetch-top-languages',
            'docs/fetchers/fetch-repo',
            'docs/fetchers/fetch-contributed-to',
            'docs/fetchers/fetch-gist',
            'docs/fetchers/fetch-organization',
            'docs/fetchers/fetch-wakatime-stats',
            'docs/fetchers/fetch-repo-user-stats',
          ],
        },
      ],
    }),
  ],
});
