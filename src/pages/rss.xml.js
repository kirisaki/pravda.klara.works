import rss, { pagesGlobToRssItems } from '@astrojs/rss';

export async function GET(context) {
    return rss({
        title: 'Pravda',
        description: '霧咲空人のブログ',
        site: context.site,
        items: await pagesGlobToRssItems(import.meta.glob('./posts/*.md')),
    });
}