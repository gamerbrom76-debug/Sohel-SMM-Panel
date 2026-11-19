import { pool } from "./db.js";

async function init() {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);
    console.log("Column added successfully.");
  } catch (e) {
    console.error("Error updating table:", e);
  } finally {
    process.exit(0);
  }
}

init();
