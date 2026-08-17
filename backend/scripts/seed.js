import pool from "../db.js";

const now = new Date();
const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

const formatDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const seed = async () => {
  try {
    const userResult = await pool.query("SELECT id FROM users WHERE email = $1", ["test@example.com"]);

    let userId;
    if (userResult.rows.length === 0) {
      console.log("Creating test user...");
      const newUser = await pool.query(
        `INSERT INTO users (name, email, password_hash, currency) VALUES ($1, $2, $3, $4) RETURNING id`,
        ["Test User", "test@example.com", "$2a$10$testhashedpassword", "USD"]
      );
      userId = newUser.rows[0].id;

      const categories = [
        { name: "Salary", type: "income", icon: "briefcase", color: "#10B981" },
        { name: "Freelance", type: "income", icon: "laptop", color: "#22C55E" },
        { name: "Food & Dining", type: "expense", icon: "utensils", color: "#F59E0B" },
        { name: "Groceries", type: "expense", icon: "shopping-cart", color: "#EAB308" },
        { name: "Transportation", type: "expense", icon: "car", color: "#EF4444" },
        { name: "Rent", type: "expense", icon: "home", color: "#F43F5E" },
        { name: "Utilities", type: "expense", icon: "zap", color: "#EC4899" },
        { name: "Entertainment", type: "expense", icon: "film", color: "#A855F7" },
      ];

      for (const cat of categories) {
        await pool.query(
          `INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES ($1, $2, $3, $4, $5, true)`,
          [userId, cat.name, cat.type, cat.icon, cat.color]
        );
      }
    } else {
      userId = userResult.rows[0].id;
      console.log(`Using existing test user (id: ${userId})`);
    }

    const catResult = await pool.query("SELECT id, name, type FROM categories WHERE user_id = $1", [userId]);
    const categories = catResult.rows;

    const getCategory = (name, type) => categories.find((c) => c.name === name && c.type === type);

    const salaryId = getCategory("Salary", "income")?.id;
    const freelanceId = getCategory("Freelance", "income")?.id;
    const foodId = getCategory("Food & Dining", "expense")?.id;
    const groceriesId = getCategory("Groceries", "expense")?.id;
    const transportId = getCategory("Transportation", "expense")?.id;
    const rentId = getCategory("Rent", "expense")?.id;
    const utilitiesId = getCategory("Utilities", "expense")?.id;
    const entertainmentId = getCategory("Entertainment", "expense")?.id;

    const txnCheck = await pool.query("SELECT COUNT(*) FROM transactions WHERE user_id = $1", [userId]);
    const txnCount = parseInt(txnCheck.rows[0].count);

    if (txnCount > 0) {
      console.log(`User already has ${txnCount} transactions. Skipping transaction seed.`);
    } else {
      console.log("Seeding transactions...");
      const transactions = [
        // Last month transactions
        { category_id: salaryId, amount: 3000, type: "income", description: "June Salary", date: formatDate(lastMonth) },
        { category_id: rentId, amount: 1200, type: "expense", description: "June Rent", date: formatDate(lastMonth) },
        { category_id: foodId, amount: 300, type: "expense", description: "June Food", date: formatDate(lastMonth) },

        // This month transactions
        { category_id: salaryId, amount: 3000, type: "income", description: "July Salary", date: formatDate(thisMonth) },
        { category_id: freelanceId, amount: 500, type: "income", description: "July Freelance", date: formatDate(thisMonth) },
        { category_id: rentId, amount: 1200, type: "expense", description: "July Rent", date: formatDate(thisMonth) },
        { category_id: groceriesId, amount: 400, type: "expense", description: "July Groceries", date: formatDate(thisMonth) },
        { category_id: transportId, amount: 150, type: "expense", description: "July Transport", date: formatDate(thisMonth) },
        { category_id: utilitiesId, amount: 200, type: "expense", description: "July Utilities", date: formatDate(thisMonth) },
        { category_id: entertainmentId, amount: 100, type: "expense", description: "July Entertainment", date: formatDate(thisMonth) },
        { category_id: foodId, amount: 250, type: "expense", description: "July Food", date: formatDate(thisMonth) },
      ];

      for (const txn of transactions) {
        await pool.query(
          `INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date) VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, txn.category_id, txn.amount, txn.type, txn.description, txn.date]
        );
      }
      console.log(`Inserted ${transactions.length} transactions.`);
    }

    console.log("Seed complete!");
  } catch (error) {
    console.error("Seed error:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seed();
