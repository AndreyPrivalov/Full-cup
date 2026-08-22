import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { banks } from "../schema.js";

export const insertBankSchema = createInsertSchema(banks, {
  name: z.string().min(1, "Название банка обязательно"),
  month_limit: z.number().min(0, "month_limit должен быть положительным числом"),
});
