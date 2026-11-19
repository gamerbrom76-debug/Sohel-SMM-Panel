import { pool } from "./db.js"; await pool.query('ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash TEXT;'); process.exit(0);
