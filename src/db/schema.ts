import { pgTable, serial, varchar, text, integer, timestamp, boolean, doublePrecision } from 'drizzle-orm/pg-core';

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  url: varchar('url').unique(),
  user_id: integer('user_id').default(0).notNull(),
  raw_html: text('raw_html'),
  content: text('content'),
  cover_url: varchar('cover_url'),
  title: varchar('title'),
  summary: text('summary'),
  summary_short: text('summary_short'),
  has_vector_summary: boolean('has_vector_summary').default(false),
  created_at: timestamp('created_at'),
  is_removed: boolean('is_removed'),
  aspect_ratio: doublePrecision('aspect_ratio'),
});

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;