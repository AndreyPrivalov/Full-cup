import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../shared/schema.js",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./db/fullcup.db",
  },
});
