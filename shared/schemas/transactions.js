import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { transactions } from "../schema.js";

export const insertTransactionSchema = createInsertSchema(transactions, {
  amount: z.number().positive("Сумма должна быть больше нуля"),
  type: z.enum(["income", "expense"], { required_error: "Тип операции обязателен" }),
  date: z.string().min(1, "Дата обязательна"),
});
