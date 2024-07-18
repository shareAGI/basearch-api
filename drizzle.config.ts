import { defineConfig } from "drizzle-kit";
 
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: 'postgresql',
  dbCredentials: {
    // url: process.env.DRIZZLE_DATABASE_URL,
    url: "postgresql://root:8X5vF12QI3b9ATCEZ0DsWOMY7wx6eSu4@hkg1.clusters.zeabur.com:30193/zeabur"
  }
});
