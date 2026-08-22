import { desc, eq } from "drizzle-orm";
import express from "express";
import { savings } from "shared/schema.js";
import { insertSavingsSchema } from "shared/schemas/savings.js";
import { db } from "../db/index.js";
import { apiHandler } from "../utils/apiHandler.js";

const router = express.Router();

// GET /api/savings
router.get(
  "/",
  apiHandler((_req, res) => {
    const data = db.select().from(savings).orderBy(savings.date).all();

    // Calculate dynamics
    const result = data.map((item, index) => {
      const total = item.cash + item.electronic;
      let dynamics = 0;
      let dynamics_with_global_projects = 0;

      if (index > 0) {
        const previousItem = data[index - 1];
        const previousTotal = previousItem.cash + previousItem.electronic;
        dynamics = total - previousTotal;
        dynamics_with_global_projects = dynamics + (item.global_projects || 0);
      }

      return {
        ...item,
        total,
        dynamics,
        dynamics_with_global_projects,
      };
    });

    res.json(result);
  }),
);

// POST /api/savings
router.post(
  "/",
  apiHandler((req, res) => {
    let newDate = req.body.date;
    const newCash = req.body.cash ? Number(req.body.cash) : 0;
    const newElectronic = req.body.electronic ? Number(req.body.electronic) : 0;
    const newGlobalProjects = req.body.global_projects ? Number(req.body.global_projects) : 0;
    const newDebts =
      req.body.debts !== undefined && req.body.debts !== null && req.body.debts !== ""
        ? Number(req.body.debts)
        : null;

    if (!newDate) {
      // Find the last record
      const lastRecord = db.select().from(savings).orderBy(desc(savings.date)).limit(1).get();
      if (lastRecord) {
        const dateObj = new Date(lastRecord.date);
        dateObj.setMonth(dateObj.getMonth() + 1);
        newDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-01`;
      } else {
        const now = new Date();
        newDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      }
    }

    const validatedData = insertSavingsSchema.parse({
      date: newDate,
      cash: newCash,
      electronic: newElectronic,
      global_projects: newGlobalProjects,
      debts: newDebts,
    });

    const info = db.insert(savings).values(validatedData).run();

    res.status(201).json({
      id: info.lastInsertRowid,
      ...validatedData,
    });
  }),
);

// PUT /api/savings/:id
router.put(
  "/:id",
  apiHandler((req, res) => {
    const id = Number(req.params.id);
    const existing = db.select().from(savings).where(eq(savings.id, id)).get();
    if (!existing) {
      return res.status(404).json({ error: "Record not found" });
    }

    let parsedDebts = req.body.debts;
    if (parsedDebts !== undefined) {
      parsedDebts = parsedDebts !== null && parsedDebts !== "" ? Number(parsedDebts) : null;
    } else {
      parsedDebts = existing.debts;
    }

    const validatedData = insertSavingsSchema.parse({
      date: req.body.date !== undefined ? req.body.date : existing.date,
      cash: req.body.cash !== undefined ? Number(req.body.cash) : existing.cash,
      electronic:
        req.body.electronic !== undefined ? Number(req.body.electronic) : existing.electronic,
      global_projects:
        req.body.global_projects !== undefined
          ? Number(req.body.global_projects)
          : existing.global_projects,
      debts: parsedDebts,
    });

    db.update(savings).set(validatedData).where(eq(savings.id, id)).run();

    res.json({ id, ...validatedData });
  }),
);

export default router;
