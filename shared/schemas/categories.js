import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { categories } from "../schema.js";

export const insertCategorySchema = createInsertSchema(categories, {
  name: z.string().min(1, "Название категории обязательно"),
  type: z.enum(["income", "expense"], {
    required_error: "Тип должен быть либо income, либо expense",
  }),
});
