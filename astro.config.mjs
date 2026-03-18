// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  site: 'https://pravda.klara.works/',

  i18n: {
      locales: ['ja', 'en'],
      defaultLocale: 'ja',
      routing: {
          prefixDefaultLocale: true,
          redirectToDefaultLocale: true,
      },
  },

  integrations: [preact()],
});