import express from "express";
import { categories } from "shared/schema.js";
import { db } from "../db/index.js";
import { apiHandler } from "../utils/apiHandler.js";

const router = express.Router();

// GET /api/categories
router.get(
  "/",
  apiHandler(async (_req, res) => {
    const data = await db.select().from(categories).orderBy(categories.id);
    res.json(data);
  }),
);

export default router;
