import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { savings } from "../schema.js";

export const insertSavingsSchema = createInsertSchema(savings, {
  date: z.string().min(1, "Дата обязательна"),
  cash: z.number().min(0, "Наличные должны быть числом >= 0"),
  electronic: z.number().min(0, "Электронные деньги должны быть числом >= 0"),
  global_projects: z.number().min(0, "Глобальные проекты должны быть числом >= 0").optional(),
  debts: z.number().min(0, "Долги должны быть числом >= 0").nullable().optional(),
});
