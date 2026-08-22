import { eq, sql } from "drizzle-orm";
import express from "express";
import { banks, categories, project_allocations, projects, transactions } from "shared/schema.js";
import { db } from "../db/index.js";
import { apiHandler } from "../utils/apiHandler.js";

const router = express.Router();

function getDaysUntilReset() {
  const today = new Date();
  // Следующий месяц, 1-е число
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const diffTime = Math.abs(nextMonth - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function calcItemWithPercentage(item, spentField) {
  const spent = item[spentField] || 0;
  const limit = item.month_limit || 0;
  const current_balance = Math.max(0, limit - spent);
  let spent_percentage = 0;

  if (limit > 0) {
    spent_percentage = Math.round((spent / limit) * 100);
  }

  return {
    ...item,
    current_balance,
    spent_percentage,
    days_until_reset: getDaysUntilReset(),
  };
}

// GET /api/dashboard
router.get(
  "/",
  apiHandler((req, res) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    const currentDate = today.getDate();

    const formatDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const currentMonthStart = formatDate(new Date(currentYear, currentMonth, 1));
    const currentMonthEnd = formatDate(new Date(currentYear, currentMonth + 1, 0));

    let controlPeriodStart;
    let controlPeriodEnd;
    let controlPeriodDivider = 1;

    const mode = req.query.control_period || "prev_month";

    if (mode === "prev_month_to_date") {
      controlPeriodStart = formatDate(new Date(currentYear, currentMonth - 1, 1));
      const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
      const prevMonthSameDayDate = Math.min(currentDate, prevMonthDays);
      controlPeriodEnd = formatDate(new Date(currentYear, currentMonth - 1, prevMonthSameDayDate));
    } else if (mode === "avg_3_months") {
      controlPeriodStart = formatDate(new Date(currentYear, currentMonth - 3, 1));
      controlPeriodEnd = formatDate(new Date(currentYear, currentMonth, 0));
      controlPeriodDivider = 3;
    } else if (mode === "avg_6_months") {
      controlPeriodStart = formatDate(new Date(currentYear, currentMonth - 6, 1));
      controlPeriodEnd = formatDate(new Date(currentYear, currentMonth, 0));
      controlPeriodDivider = 6;
    } else if (mode === "avg_12_months") {
      controlPeriodStart = formatDate(new Date(currentYear, currentMonth - 12, 1));
      controlPeriodEnd = formatDate(new Date(currentYear, currentMonth, 0));
      controlPeriodDivider = 12;
    } else {
      // prev_month fallback
      controlPeriodStart = formatDate(new Date(currentYear, currentMonth - 1, 1));
      controlPeriodEnd = formatDate(new Date(currentYear, currentMonth, 0));
    }

    const getCategoriesData = (type) => {
      return db
        .select({
          id: categories.id,
          name: categories.name,
          current_month:
            sql`COALESCE(SUM(CASE WHEN ${transactions.date} >= ${currentMonthStart} AND ${transactions.date} <= ${currentMonthEnd} THEN ${transactions.amount} ELSE 0 END), 0)`.mapWith(
              Number,
            ),
          previous_month:
            sql`ROUND(COALESCE(SUM(CASE WHEN ${transactions.date} >= ${controlPeriodStart} AND ${transactions.date} <= ${controlPeriodEnd} THEN ${transactions.amount} ELSE 0 END), 0) / ${controlPeriodDivider})`.mapWith(
              Number,
            ),
        })
        .from(categories)
        .leftJoin(
          transactions,
          sql`${categories.id} = ${transactions.category_id} AND ${transactions.type} = ${type}`,
        )
        .where(eq(categories.type, type))
        .groupBy(categories.id)
        .all();
    };

    const categories_expenses = getCategoriesData("expense");
    const categories_incomes = getCategoriesData("income");

    const banksRaw = db
      .select({
        id: banks.id,
        name: banks.name,
        month_limit: banks.month_limit,
        spent_this_month: sql`COALESCE(SUM(${transactions.amount}), 0)`.mapWith(Number),
      })
      .from(banks)
      .leftJoin(
        transactions,
        sql`${banks.id} = ${transactions.bank_id} AND ${transactions.type} = 'expense' AND ${transactions.date} >= ${currentMonthStart} AND ${transactions.date} <= ${currentMonthEnd}`,
      )
      .groupBy(banks.id)
      .all();

    const banks_result = banksRaw.map((b) => calcItemWithPercentage(b, "spent_this_month"));

    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

    const projectsRaw = db
      .select({
        id: projects.id,
        name: projects.name,
        month_limit: sql`COALESCE(${project_allocations.limit}, 0)`.mapWith(Number),
        spent_this_month: sql`COALESCE(SUM(${transactions.amount}), 0)`.mapWith(Number),
      })
      .from(projects)
      .leftJoin(
        project_allocations,
        sql`${projects.id} = ${project_allocations.project_id} AND ${project_allocations.month} = ${currentMonthStr}`,
      )
      .leftJoin(
        transactions,
        sql`${projects.id} = ${transactions.project_id} AND ${transactions.type} = 'expense' AND ${transactions.date} >= ${currentMonthStart} AND ${transactions.date} <= ${currentMonthEnd}`,
      )
      .where(eq(projects.status, "active"))
      .groupBy(projects.id)
      .all();

    const projects_result = projectsRaw.map((p) => calcItemWithPercentage(p, "spent_this_month"));

    res.json({
      categories_expenses,
      categories_incomes,
      banks: banks_result,
      projects: projects_result,
      days_until_reset: getDaysUntilReset(),
    });
  }),
);

export default router;
