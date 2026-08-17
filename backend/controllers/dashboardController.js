import pool from "../db.js";

const pctChange = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
};

const formatDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const getSummary = async (req, res) => {
  try {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await pool.query(
      `SELECT
          COALESCE(SUM(CASE WHEN transaction_date >= $1 AND transaction_date < $2 AND type = 'income' THEN amount END), 0) AS income_this_month,
          COALESCE(SUM(CASE WHEN transaction_date >= $1 AND transaction_date < $2 AND type = 'expense' THEN amount END), 0) AS expense_this_month,
          COALESCE(SUM(CASE WHEN transaction_date >= $3 AND transaction_date < $4 AND type = 'income' THEN amount END), 0) AS income_last_month,
          COALESCE(SUM(CASE WHEN transaction_date >= $3 AND transaction_date < $4 AND type = 'expense' THEN amount END), 0) AS expense_last_month
       FROM transactions
       WHERE user_id = $5`,
      [
        formatDate(lastMonth),
        formatDate(currentMonth),
        formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        formatDate(lastMonth),
        req.userId,
      ]
    );

    const row = result.rows[0];

    const incomeThisMonth = parseFloat(row.income_this_month);
    const expenseThisMonth = parseFloat(row.expense_this_month);
    const incomeLastMonth = parseFloat(row.income_last_month);
    const expenseLastMonth = parseFloat(row.expense_last_month);

    const balance = incomeThisMonth - expenseThisMonth;
    const savingsRate =
      incomeThisMonth > 0
        ? (balance / incomeThisMonth) * 100
        : 0;

    res.json({
      incomeThisMonth,
      expenseThisMonth,
      balance,
      savingsRate,
      incomeDelta: pctChange(incomeThisMonth, incomeLastMonth),
      expenseDelta: pctChange(expenseThisMonth, expenseLastMonth),
    });
  } catch (error) {
    console.error("GetSummary error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getCategoryBreakdown = async (req, res) => {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await pool.query(
      `SELECT
          c.id AS category_id,
          c.name AS category_name,
          c.icon AS category_icon,
          c.color AS category_color,
          SUM(t.amount) AS total,
          COUNT(t.id) AS transaction_count
       FROM transactions t
       JOIN categories c
         ON c.id = t.category_id
       WHERE t.user_id = $1
         AND t.type = 'expense'
         AND t.transaction_date >= $2
       GROUP BY c.id, c.name, c.icon, c.color
       ORDER BY total DESC`,
      [req.userId, formatDate(currentMonthStart)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GetCategoryBreakdown error:', error);

    res.status(500).json({
      message: 'Server error',
    });
  }
};

export const getMonthlyTrend = async (req, res) => {
  try {
    const now = new Date();
    const fiveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const result = await pool.query(
      `SELECT
          to_char(transaction_date, 'YYYY-MM') AS month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
       FROM transactions
       WHERE user_id = $1
         AND transaction_date >= $2
       GROUP BY 1
       ORDER BY 1`,
      [req.userId, formatDate(fiveMonthsAgo)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GetMonthlyTrend error:', error);

    res.status(500).json({
      message: 'Server error',
    });
  }
};