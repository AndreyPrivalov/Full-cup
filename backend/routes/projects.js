import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import express from "express";
import { monthly_budgets, project_allocations, projects, transactions } from "shared/schema.js";
import { insertProjectSchema } from "shared/schemas/projects.js";
import { db } from "../db/index.js";
import { apiHandler } from "../utils/apiHandler.js";

const router = express.Router();

function calculatePriority(p) {
  const comfort = Number(p.comfort) || 0;
  const aesthetics = Number(p.aesthetics) || 0;
  const social_capital = Number(p.social_capital) || 0;
  const functionality = Number(p.functionality) || 0;
  const liquidity = Number(p.liquidity) || 0;
  const urgency = Number(p.urgency) || 0;

  const score =
    (1 * comfort + 0.65 * aesthetics + 0.4 * social_capital + 0.8 * functionality) / 2.85;
  const base = score + liquidity / 2;
  const multiplier = 1 + urgency / 20;
  const priority = base * multiplier * 6.6;
  return Math.round(priority * 100) / 100;
}

function getRewardDetails(priority, size, andreyShare, dianaShare) {
  const kMap = {
    XS: 10,
    S: 50,
    M: 150,
    L: 400,
    XL: 1000,
  };
  const k = kMap[size] || 0;
  const reward = Math.round(priority * k * 100) / 100;
  const andrey_reward = Math.round(reward * (andreyShare / 100) * 100) / 100;
  const diana_reward = Math.round(reward * (dianaShare / 100) * 100) / 100;
  return { reward, andrey_reward, diana_reward };
}

function parseProjectBody(body) {
  return insertProjectSchema.parse({
    ...body,
    month_limit: body.month_limit !== undefined ? Number(body.month_limit) : 0,
    liquidity:
      body.liquidity !== undefined && body.liquidity !== "" && body.liquidity !== null
        ? Number(body.liquidity)
        : null,
    comfort:
      body.comfort !== undefined && body.comfort !== "" && body.comfort !== null
        ? Number(body.comfort)
        : null,
    aesthetics:
      body.aesthetics !== undefined && body.aesthetics !== "" && body.aesthetics !== null
        ? Number(body.aesthetics)
        : null,
    social_capital:
      body.social_capital !== undefined &&
      body.social_capital !== "" &&
      body.social_capital !== null
        ? Number(body.social_capital)
        : null,
    functionality:
      body.functionality !== undefined && body.functionality !== "" && body.functionality !== null
        ? Number(body.functionality)
        : null,
    urgency:
      body.urgency !== undefined && body.urgency !== "" && body.urgency !== null
        ? Number(body.urgency)
        : null,
    andrey_share: body.andrey_share !== undefined ? Number(body.andrey_share) : 0,
    diana_share: body.diana_share !== undefined ? Number(body.diana_share) : 0,
    name: body.name ? body.name.trim() : "",
    size: body.size || null,
    status: body.status || "backlog",
    start_date: body.start_date || null,
    type: body.type || "personal",
    owner: body.owner || null,
  });
}

// GET /api/projects
router.get(
  "/",
  apiHandler((_req, res) => {
    const rawProjects = db.select().from(projects).orderBy(projects.id).all();
    const formatted = rawProjects.map((p) => {
      const priority = calculatePriority(p);
      const rewards = getRewardDetails(priority, p.size, p.andrey_share, p.diana_share);
      return {
        ...p,
        priority,
        ...rewards,
      };
    });
    res.json(formatted);
  }),
);

// GET /api/projects/budgets/months
router.get(
  "/budgets/months",
  apiHandler((_req, res) => {
    const bMonths = db.select({ month: monthly_budgets.month }).from(monthly_budgets).all();
    const aMonths = db.select({ month: project_allocations.month }).from(project_allocations).all();

    const uniqueMonths = new Set([...bMonths.map((m) => m.month), ...aMonths.map((m) => m.month)]);

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    uniqueMonths.add(currentMonth);

    const sorted = Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));
    res.json(sorted);
  }),
);

// GET /api/projects/budgets
router.get(
  "/budgets",
  apiHandler((req, res) => {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: "Параметр month (YYYY-MM) обязателен" });
    }

    // 1. Get or initialize limits
    let limits = db.select().from(monthly_budgets).where(eq(monthly_budgets.month, month)).get();
    if (!limits) {
      db.insert(monthly_budgets)
        .values({
          month,
          andrey_limit: 15000,
          diana_limit: 15000,
          shared_limit: 30000,
        })
        .run();
      limits = {
        month,
        andrey_limit: 15000,
        diana_limit: 15000,
        shared_limit: 30000,
      };
    }

    // 2. Get allocations for this month
    const allocations = db
      .select()
      .from(project_allocations)
      .where(eq(project_allocations.month, month))
      .all();
    const allocMap = new Map(allocations.map((a) => [a.project_id, a.limit]));

    // 3. Get active projects (those allocated this month)
    const allocatedProjectIds = allocations.map((a) => a.project_id);
    const activeProjects =
      allocatedProjectIds.length > 0
        ? db.select().from(projects).where(inArray(projects.id, allocatedProjectIds)).all()
        : [];

    // 4. Get spent amounts for this month
    const spentAmounts = db
      .select({
        project_id: transactions.project_id,
        spent: sql`COALESCE(SUM(${transactions.amount}), 0)`.mapWith(Number),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "expense"),
          gte(transactions.date, `${month}-01`),
          lte(transactions.date, `${month}-31`),
        ),
      )
      .groupBy(transactions.project_id)
      .all();
    const spentMap = new Map(spentAmounts.map((s) => [s.project_id, s.spent]));

    // 5. Build projects array
    const resultProjects = activeProjects.map((p) => {
      const limit = allocMap.get(p.id) || 0;
      const spent = spentMap.get(p.id) || 0;
      const priority = calculatePriority(p);
      return {
        ...p,
        priority,
        limit,
        spent,
      };
    });

    res.json({
      limits,
      projects: resultProjects,
    });
  }),
);

// POST /api/projects/budgets/limits
router.post(
  "/budgets/limits",
  apiHandler((req, res) => {
    const { month, andrey_limit, diana_limit, shared_limit } = req.body;
    if (!month) {
      return res.status(400).json({ error: "Месяц обязателен" });
    }

    const existing = db
      .select()
      .from(monthly_budgets)
      .where(eq(monthly_budgets.month, month))
      .get();
    if (existing) {
      db.update(monthly_budgets)
        .set({
          andrey_limit: Number(andrey_limit),
          diana_limit: Number(diana_limit),
          shared_limit: Number(shared_limit),
        })
        .where(eq(monthly_budgets.month, month))
        .run();
    } else {
      db.insert(monthly_budgets)
        .values({
          month,
          andrey_limit: Number(andrey_limit),
          diana_limit: Number(diana_limit),
          shared_limit: Number(shared_limit),
        })
        .run();
    }

    res.json({ success: true });
  }),
);

// POST /api/projects/budgets/allocations
router.post(
  "/budgets/allocations",
  apiHandler((req, res) => {
    const { project_id, month, limit } = req.body;
    if (!project_id || !month) {
      return res.status(400).json({ error: "project_id и month обязательны" });
    }

    const existing = db
      .select()
      .from(project_allocations)
      .where(
        and(
          eq(project_allocations.project_id, Number(project_id)),
          eq(project_allocations.month, month),
        ),
      )
      .get();

    if (existing) {
      db.update(project_allocations)
        .set({ limit: Number(limit) })
        .where(
          and(
            eq(project_allocations.project_id, Number(project_id)),
            eq(project_allocations.month, month),
          ),
        )
        .run();
    } else {
      db.insert(project_allocations)
        .values({
          project_id: Number(project_id),
          month,
          limit: Number(limit),
        })
        .run();
    }

    res.json({ success: true });
  }),
);

// POST /api/projects
router.post(
  "/",
  apiHandler((req, res) => {
    const validatedData = parseProjectBody(req.body);

    const info = db.insert(projects).values(validatedData).run();

    const createdId = info.lastInsertRowid;
    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, Number(createdId)))
      .get();
    const priority = calculatePriority(project);
    const rewards = getRewardDetails(
      priority,
      project.size,
      project.andrey_share,
      project.diana_share,
    );

    res.status(201).json({
      ...project,
      priority,
      ...rewards,
    });
  }),
);

// PUT /api/projects/:id
router.put(
  "/:id",
  apiHandler((req, res) => {
    const { id } = req.params;
    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, Number(id)))
      .get();
    if (!project) {
      return res.status(404).json({ error: "Проект не найден" });
    }

    const validatedData = parseProjectBody(req.body);

    // Auto set start_date if transitioning to 'active' and not set yet
    if (validatedData.status === "active" && !project.start_date && !validatedData.start_date) {
      validatedData.start_date = new Date().toISOString().split("T")[0];
    }

    db.update(projects)
      .set(validatedData)
      .where(eq(projects.id, Number(id)))
      .run();

    const updated = db
      .select()
      .from(projects)
      .where(eq(projects.id, Number(id)))
      .get();
    const priority = calculatePriority(updated);
    const rewards = getRewardDetails(
      priority,
      updated.size,
      updated.andrey_share,
      updated.diana_share,
    );

    res.json({
      ...updated,
      priority,
      ...rewards,
    });
  }),
);

// DELETE /api/projects/:id
router.delete(
  "/:id",
  apiHandler((req, res) => {
    const { id } = req.params;

    db.update(transactions)
      .set({ project_id: null })
      .where(eq(transactions.project_id, Number(id)))
      .run();

    const info = db
      .delete(projects)
      .where(eq(projects.id, Number(id)))
      .run();
    if (info.changes === 0) {
      return res.status(404).json({ error: "Проект не найден" });
    }
    res.status(204).send();
  }),
);

export default router;
