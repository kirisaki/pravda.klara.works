import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

export const collections = {
  posts_ja: defineCollection({
    loader: glob({ pattern: '**/*.md', base: 'src/content/posts/ja' }),
    schema: z.object({
      title: z.string(),
      date: z.coerce.date(),
      lang: z.enum(['ja', 'en']),
      tags: z.array(z.string()).default([]),
      author: z.string().optional(),
      description: z.string().optional(),
      thumbnail: z.string().optional(),
    }),
  }),
  posts_en: defineCollection({
    loader: glob({ pattern: '**/*.md', base: 'src/content/posts/en' }),
    schema: z.object({
      title: z.string(),
      date: z.coerce.date(),
      lang: z.enum(['ja', 'en']),
      tags: z.array(z.string()).default([]),
      author: z.string().optional(),
      description: z.string().optional(),
      thumbnail: z.string().optional(),
    }),
  }),
};