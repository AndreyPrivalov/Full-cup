import { and, eq, gte, lte, sql } from "drizzle-orm";
import express from "express";
import {
  banks,
  categories,
  getCurrentMonthRange,
  getPreviousMonthRange,
  transactionBanks,
  transactions,
} from "shared";
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
  apiHandler(async (req, res) => {
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

    const { start: currentMonthStart, end: currentMonthEnd } = getCurrentMonthRange(today);
    const { start: prevMonthStart, end: prevMonthEnd } = getPreviousMonthRange(today);

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
      controlPeriodStart = prevMonthStart;
      controlPeriodEnd = prevMonthEnd;
    }

    const allStartDates = [currentMonthStart, prevMonthStart, controlPeriodStart];
    const minDate = allStartDates.reduce((min, d) => (d < min ? d : min), allStartDates[0]);
    const allEndDates = [currentMonthEnd, prevMonthEnd, controlPeriodEnd];
    const maxDate = allEndDates.reduce((max, d) => (d > max ? d : max), allEndDates[0]);

    const getCategoriesData = async (type) => {
      return await db
        .select({
          id: categories.id,
          name: categories.name,
          current_month:
            sql`COALESCE(SUM(CASE WHEN ${transactions.date} >= ${currentMonthStart} AND ${transactions.date} <= ${currentMonthEnd} THEN ${transactions.amount} ELSE 0 END), 0)`.mapWith(
              Number,
            ),
          previous_month:
            sql`COALESCE(SUM(CASE WHEN ${transactions.date} >= ${prevMonthStart} AND ${transactions.date} <= ${prevMonthEnd} THEN ${transactions.amount} ELSE 0 END), 0)`.mapWith(
              Number,
            ),
          control_value:
            sql`ROUND(COALESCE(SUM(CASE WHEN ${transactions.date} >= ${controlPeriodStart} AND ${transactions.date} <= ${controlPeriodEnd} THEN ${transactions.amount} ELSE 0 END), 0) / ${controlPeriodDivider})`.mapWith(
              Number,
            ),
        })
        .from(categories)
        .leftJoin(
          transactions,
          sql`${categories.id} = ${transactions.category_id} AND ${transactions.type} = ${type} AND ${transactions.date} >= ${minDate} AND ${transactions.date} <= ${maxDate}`,
        )
        .where(eq(categories.type, type))
        .groupBy(categories.id);
    };

    const getBanksData = async () => {
      const spentSubquery = db
        .select({
          bank_id: transactionBanks.bank_id,
          total_spent: sql`SUM(${transactionBanks.amount})`.mapWith(Number).as("total_spent"),
        })
        .from(transactionBanks)
        .innerJoin(transactions, eq(transactions.id, transactionBanks.transaction_id))
        .where(
          and(
            eq(transactions.type, "expense"),
            gte(transactions.date, currentMonthStart),
            lte(transactions.date, currentMonthEnd),
          ),
        )
        .groupBy(transactionBanks.bank_id)
        .as("spent_sub");

      return await db
        .select({
          id: banks.id,
          name: banks.name,
          month_limit: banks.month_limit,
          spent_this_month: sql`COALESCE(${spentSubquery.total_spent}, 0)`.mapWith(Number),
        })
        .from(banks)
        .leftJoin(spentSubquery, eq(banks.id, spentSubquery.bank_id))
        .orderBy(banks.id);
    };

    const [categories_expenses, categories_incomes, banksRaw] = await Promise.all([
      getCategoriesData("expense"),
      getCategoriesData("income"),
      getBanksData(),
    ]);

    const banks_result = banksRaw.map((b) => calcItemWithPercentage(b, "spent_this_month"));

    res.json({
      categories_expenses,
      categories_incomes,
      banks: banks_result,
      days_until_reset: getDaysUntilReset(),
    });
  }),
);

export default router;
