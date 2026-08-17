import pool from "../db.js";
import { analyzeBudgetList } from "../utils/gemini.js";

export { analyzeBudgetList };

const formatDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const getBudgets = async (req, res) => {
  try {
    const now = new Date();
    const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weeklyStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay() + 1,
    );

    const monthlyStartStr = formatDate(monthlyStart);
    const weeklyStartStr = formatDate(weeklyStart);

    const result = await pool.query(
      `SELECT
          b.id,
          b.category_id,
          b.amount,
          b.period,
          b.start_date,
          c.name AS category_name,
          c.icon AS category_icon,
          c.color AS category_color,
          COALESCE(SUM(t.amount), 0) AS spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t
         ON t.category_id = b.category_id
         AND t.user_id = b.user_id
         AND t.type = 'expense'
         AND (
           (b.period = 'monthly' AND t.transaction_date >= $2)
           OR (b.period = 'weekly' AND t.transaction_date >= $3)
         )
       WHERE b.user_id = $1
       GROUP BY b.id, c.name, c.icon, c.color
       ORDER BY c.name`,
      [req.userId, monthlyStartStr, weeklyStartStr],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GetBudgets error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const createBudget = async (req, res) => {
  const { categoryId, amount, period = "monthly", startDate } = req.body;

  if (!categoryId || !amount) {
    return res.status(400).json({
      message: "categoryId and amount are required",
    });
  }

  if (!["monthly", "weekly"].includes(period)) {
    return res.status(400).json({
      message: "Period must be monthly or weekly",
    });
  }

  try {
    const today = new Date();
    const monthStart = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}-01`;

    const effectiveStart = startDate || monthStart;

    const result = await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, period, start_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.userId, categoryId, amount, period, effectiveStart],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({
        message: "Budget already exists for this category and period",
      });
    }

    console.error("CreateBudget error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const updateBudget = async (req, res) => {
  const { id } = req.params;
  const { amount, period } = req.body;

  try {
    const result = await pool.query(
      `UPDATE budgets
       SET amount = COALESCE($1, amount),
           period = COALESCE($2, period)
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [amount, period, id, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("UpdateBudget error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const deleteBudget = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM budgets
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    res.json({
      message: "Budget deleted",
    });
  } catch (error) {
    console.error("DeleteBudget error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const analyzeBudgets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
                b.id,
                b.amount,
                b.period,
                c.name AS category_name,
                COALESCE(SUM(t.amount), 0) AS spent
            FROM budgets b
            JOIN categories c ON c.id = b.category_id
            LEFT JOIN transactions t
                ON t.category_id = b.category_id
                AND t.user_id = b.user_id
                AND t.type = 'expense'
                AND (
                    (b.period = 'monthly' AND t.transaction_date >= date_trunc('month', CURRENT_DATE))
                    OR
                    (b.period = 'weekly' AND t.transaction_date >= date_trunc('week', CURRENT_DATE))
                )
            WHERE b.user_id = $1
            GROUP BY b.id, c.name`,
      [req.userId],
    );
    if (result.rows.length === 0) {
      return res.json({ analysis: [] });
    }
    const userRes = await pool.query(
      `SELECT currency FROM users WHERE id = $1`,
      [req.userId],
    );
    const currency = userRes.rows[0]?.currency || "USD";

    const data = await analyzeBudgetList({
      budgets: result.rows,
      currency: currency,
    });
    res.json(data);
  } catch (error) {
    console.error("AnalyzeBudgets error:", error);
    res.status(500).json({
      message: error.message || "Server error",
    });
  }
};
