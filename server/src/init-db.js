import { pool } from "./db.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(here, "schema.sql"), "utf8");
try { await pool.query(sql); console.log("Database schema created."); }
  try { await pool.query(sql); await pool.query('ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash TEXT;'); console.log("Database schema created."); }
catch (e) { console.error(e); process.exitCode = 1; }

