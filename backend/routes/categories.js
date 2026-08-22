import express from "express";
import { categories } from "shared/schema.js";
import { insertCategorySchema } from "shared/schemas/categories.js";
import { db } from "../db/index.js";
import { apiHandler } from "../utils/apiHandler.js";

const router = express.Router();

// GET /api/categories
router.get(
  "/",
  apiHandler((_req, res) => {
    const data = db.select().from(categories).orderBy(categories.id).all();
    res.json(data);
  }),
);

// POST /api/categories
router.post(
  "/",
  apiHandler((req, res) => {
    const validatedData = insertCategorySchema.parse(req.body);

    const info = db
      .insert(categories)
      .values({
        name: validatedData.name.trim(),
        type: validatedData.type,
      })
      .run();

    res.status(201).json({
      id: info.lastInsertRowid,
      name: validatedData.name.trim(),
      type: validatedData.type,
    });
  }),
);

export default router;
