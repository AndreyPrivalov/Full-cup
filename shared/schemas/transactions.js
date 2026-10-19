import { z } from "zod";

export const insertTransactionSchema = z.object({
  id: z.number().int().positive().optional(),
  amount: z.number().positive("Сумма должна быть больше нуля"),
  type: z.enum(["income", "expense"], { required_error: "Тип операции обязателен" }),
  date: z.string().min(1, "Дата обязательна"),
  category_id: z.number().nullable().optional(),
  comment: z.string().nullable().optional(),
  bank_id: z
    .union([z.number(), z.array(z.number())])
    .nullable()
    .optional(),
  bank_ids: z.array(z.number()).nullable().optional(),
  bank_amount: z.number().positive().nullable().optional(),
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
  bank_id: z
    .union([z.number(), z.array(z.number())])
    .nullable()
    .optional(),
  bank_ids: z.array(z.number()).nullable().optional(),
  bank_amount: z.number().positive().nullable().optional(),
  comment: z.string().nullable().optional(),
});
