import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projects } from "../schema.js";

export const insertProjectSchema = createInsertSchema(projects, {
  name: z.string().min(1, "Название проекта обязательно"),
  month_limit: z.number().min(0).default(0),
  size: z.enum(["XS", "S", "M", "L", "XL"]).nullable().optional(),
  liquidity: z.number().min(0).max(10).nullable().optional(),
  comfort: z.number().min(0).max(10).nullable().optional(),
  aesthetics: z.number().min(0).max(10).nullable().optional(),
  social_capital: z.number().min(0).max(10).nullable().optional(),
  functionality: z.number().min(0).max(10).nullable().optional(),
  urgency: z.number().min(0).max(10).nullable().optional(),
  status: z.enum(["backlog", "planned", "active", "completed", "cancelled"]).default("backlog"),
  start_date: z.string().nullable().optional(),
  type: z.enum(["personal", "shared"]).default("personal"),
  owner: z.enum(["Андрей", "Диана"]).nullable().optional(),
  andrey_share: z.number().min(0).max(100).default(0),
  diana_share: z.number().min(0).max(100).default(0),
});
