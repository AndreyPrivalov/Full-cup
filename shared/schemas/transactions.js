import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { transactions } from "../schema.js";

export const insertTransactionSchema = createInsertSchema(transactions, {
  amount: z.number().positive("Сумма должна быть больше нуля"),
  type: z.enum(["income", "expense"], { required_error: "Тип операции обязателен" }),
  date: z.string().min(1, "Дата обязательна"),
});

export const updateTransactionSchema = z.object({
  amount: z.number().positive("Сумма должна быть больше нуля").optional(),
  type: z
    .enum(["income", "expense"], {
      errorMap: () => ({ message: "Тип операции должен быть income или expense" }),
    })
    .optional(),
  date: z.string().min(1, "Дата не может быть пустой").optional(),
  category_id: z.number().nullable().optional(),
  bank_id: z.number().nullable().optional(),
  comment: z.string().nullable().optional(),
});
