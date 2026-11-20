import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DROP_ALL = `
    DROP TABLE IF EXISTS password_resets CASCADE;
    DROP TABLE IF EXISTS ai_insights CASCADE;
    DROP TABLE IF EXISTS budgets CASCADE;
    DROP TABLE IF EXISTS transactions CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
`;

const runMigration = async () => {
  const shouldReset = process.argv.includes("--reset");
  const sqlDir = path.join(__dirname, "..", "sql");
  const schemaPath = path.join(sqlDir, "schema.sql");
  const migrationsDir = path.join(sqlDir, "migrations");

  try {
    if (shouldReset) {
      console.log("Dropping existing tables...");
      await pool.query(DROP_ALL);
    }

    // Base schema only runs on an empty database; incremental migrations
    // below are idempotent and always run, so existing DBs can be upgraded.
    const { rows } = await pool.query("SELECT to_regclass('public.users') AS t");
    if (!rows[0].t) {
      console.log(`Reading schema from ${schemaPath}`);
      await pool.query(await fs.readFile(schemaPath, "utf-8"));
      console.log("Base schema created.");
    } else {
      console.log("Base schema already present, skipping schema.sql.");
    }

    const files = (await fs.readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      console.log(`Applying migration ${file}...`);
      await pool.query(await fs.readFile(path.join(migrationsDir, file), "utf-8"));
    }

    console.log("Migration complete.");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runMigration();
