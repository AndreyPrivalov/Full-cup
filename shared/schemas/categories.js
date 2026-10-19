import { z } from "zod";

export const insertCategorySchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, "Название категории обязательно"),
  type: z.enum(["income", "expense"], {
    required_error: "Тип должен быть либо income, либо expense",
  }),
});
