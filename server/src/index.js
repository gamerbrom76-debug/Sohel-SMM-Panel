import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { submitProviderOrder } from "./provider.js";
import authRoutes from './auth.js';.
dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use('/auth', authRoutes);.
app.use(express.json({ limit: "200kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "sohel-smm-api" }));

app.get("/api/services", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id,name,category,description,unit_price,min_quantity,max_quantity FROM services WHERE active=true ORDER BY category,name"
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Could not load services." }); }
});

app.get("/api/orders", async (req, res) => {
  const userId = Number(req.query.userId || 1); // Demo identity only; replace after authentication.
  try {
    const { rows } = await pool.query(
      `SELECT o.id,o.target_url,o.quantity,o.amount,o.status,o.created_at,s.name AS service_name
       FROM orders o JOIN services s ON s.id=o.service_id
       WHERE o.user_id=$1 ORDER BY o.created_at DESC LIMIT 100`, [userId]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: "Could not load orders." }); }
});

app.get("/api/wallet/:userId", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT balance FROM wallets WHERE user_id=$1", [req.params.userId]);
    res.json({ balance: rows[0]?.balance ?? "0.00", currency: "INR" });
  } catch { res.status(500).json({ error: "Could not load wallet." }); }
});

app.post("/api/orders", async (req, res) => {
  const { userId = 1, serviceId, targetUrl, quantity } = req.body || {};
  if (!Number.isInteger(Number(serviceId)) || !Number.isInteger(Number(quantity)) ||
      Number(quantity) <= 0 || typeof targetUrl !== "string" ||
      !/^https:\/\/\S+$/i.test(targetUrl)) {
    return res.status(400).json({ error: "Provide a valid service, HTTPS target URL and positive quantity." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: sr } = await client.query(
      "SELECT * FROM services WHERE id=$1 AND active=true FOR SHARE", [serviceId]
    );
    if (!sr.length) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Service not found." }); }
    const service = sr[0], qty = Number(quantity);
    if (qty < service.min_quantity || qty > service.max_quantity) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}.` });
    }
    const amount = (Number(service.unit_price) * qty).toFixed(2);
    const { rows: wr } = await client.query("SELECT balance FROM wallets WHERE user_id=$1 FOR UPDATE", [userId]);
    if (!wr.length || Number(wr[0].balance) < Number(amount)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Insufficient wallet balance. Demo wallet funding is not enabled." });
    }
    const order = await client.query(
      "INSERT INTO orders(user_id,service_id,target_url,quantity,amount) VALUES($1,$2,$3,$4,$5) RETURNING id,status,amount",
      [userId, serviceId, targetUrl, qty, amount]
    );
    await client.query("UPDATE wallets SET balance=balance-$1,updated_at=NOW() WHERE user_id=$2", [amount,userId]);
    await client.query(
      "INSERT INTO wallet_transactions(user_id,amount,direction,description,reference) VALUES($1,$2,'debit',$3,$4)",
      [userId,amount,`Order #${order.rows[0].id}`,`order-${order.rows[0].id}`]
    );
    await client.query("COMMIT");
    // Provider adapter is intentionally not invoked until approved provider mapping is configured.
    res.status(201).json({ ...order.rows[0], note: "Saved locally. Provider dispatch is not configured." });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "Could not create order." });
  } finally { client.release(); }
});

app.get("/api/admin/summary", async (_req, res) => {
  try {
    const [users, orders, services] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM users"),
      pool.query("SELECT COUNT(*)::int AS count FROM orders"),
      pool.query("SELECT COUNT(*)::int AS count FROM services WHERE active=true")
    ]);
    res.json({ users: users.rows[0].count, orders: orders.rows[0].count, activeServices: services.rows[0].count });
  } catch { res.status(500).json({ error: "Could not load admin summary." }); }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on ${port}`));
