import { z } from "zod";

export const insertBankSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, "Название банка обязательно"),
  month_limit: z.number().min(0, "month_limit должен быть положительным числом"),
});
