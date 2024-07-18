import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from 'drizzle-orm';
import { Pool } from "pg";
import { articles } from "../db/schema";

export class DatabaseService {
  private db: ReturnType<typeof drizzle>;

  constructor(databaseUrl: string) {
    const pool = new Pool({ connectionString: databaseUrl });
    this.db = drizzle(pool);
  }

  async saveArticle(data: any) {
    return this.db.insert(articles).values(data).returning();
  }
  async getAllBookmarks() {
    return this.db
      .select()
      .from(articles)
      .where(eq(articles.is_removed, false));
  }

  async updateBookmark(
    url: string,
    data: Partial<typeof articles.$inferInsert>
  ) {
    return this.db
      .update(articles)
      .set(data)
      .where(eq(articles.url, url))
      .returning();
  }

  async deleteBookmark(url: string) {
    return this.db
      .update(articles)
      .set({ is_removed: true })
      .where(eq(articles.url, url))
      .returning();
  }
  async testWrite() {
    return this.db
      .insert(articles)
      .values({
        url: "https://example.com",
        raw_html: "<html><body></body></html>",
        content: "Example content",
        cover_url: "https://example.com/cover.jpg",
        title: "Example title",
        created_at: new Date(),
      })
      .returning();
  }
}
