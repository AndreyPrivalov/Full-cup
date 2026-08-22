import { integer, primaryKey, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    type: text("type", { enum: ["income", "expense"] }).notNull(),
  },
  (t) => ({
    unq: unique().on(t.name, t.type),
  }),
);

export const banks = sqliteTable("banks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  month_limit: real("month_limit").notNull(),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  month_limit: real("month_limit").notNull().default(0),
  size: text("size"), // XS, S, M, L, XL
  liquidity: integer("liquidity"), // 0..10
  comfort: integer("comfort"), // 0..10
  aesthetics: integer("aesthetics"), // 0..10
  social_capital: integer("social_capital"), // 0..10
  functionality: integer("functionality"), // 0..10
  urgency: integer("urgency"), // 0..10
  status: text("status").notNull().default("backlog"), // backlog, planned, active, completed, cancelled
  start_date: text("start_date"), // YYYY-MM-DD
  type: text("type").notNull().default("personal"), // personal, shared
  owner: text("owner"), // Андрей, Диана
  andrey_share: integer("andrey_share").notNull().default(0), // 0..100
  diana_share: integer("diana_share").notNull().default(0), // 0..100
});

export const monthly_budgets = sqliteTable("monthly_budgets", {
  month: text("month").primaryKey(),
  andrey_limit: real("andrey_limit").notNull().default(15000),
  diana_limit: real("diana_limit").notNull().default(15000),
  shared_limit: real("shared_limit").notNull().default(30000),
});

export const project_allocations = sqliteTable(
  "project_allocations",
  {
    project_id: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    limit: real("limit").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.project_id, t.month] }),
  }),
);

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: real("amount").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  category_id: integer("category_id").references(() => categories.id),
  bank_id: integer("bank_id").references(() => banks.id),
  project_id: integer("project_id").references(() => projects.id),
  date: text("date").notNull(),
  comment: text("comment"),
});

export const savings = sqliteTable("savings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  cash: real("cash").notNull(),
  electronic: real("electronic").notNull(),
  global_projects: real("global_projects").notNull().default(0),
  debts: real("debts"),
});
