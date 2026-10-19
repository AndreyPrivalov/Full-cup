import { integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

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

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: real("amount").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  category_id: integer("category_id").references(() => categories.id),
  bank_id: integer("bank_id").references(() => banks.id),
  bank_amount: real("bank_amount"),
  date: text("date").notNull(),
  comment: text("comment"),
});

export const transactionBanks = sqliteTable(
  "transaction_banks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    transaction_id: integer("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    bank_id: integer("bank_id")
      .notNull()
      .references(() => banks.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
  },
  (t) => ({
    unq: unique().on(t.transaction_id, t.bank_id),
  }),
);

export const savings = sqliteTable("savings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  cash: real("cash").notNull(),
  electronic: real("electronic").notNull(),
  global_projects: real("global_projects").notNull().default(0),
  debts: real("debts"),
});
