// @ts-check
import { defineConfig } from 'astro/config';

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
});
