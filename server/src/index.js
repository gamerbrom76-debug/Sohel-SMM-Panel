import './init-db.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { pool } from './db.js';
import authRoutes from './auth.js';

dotenv.config();

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '200kb' }));

// AUTH ROUTES
app.use('/auth', authRoutes);

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'sohel-smm-api'
  });
});

// GET SERVICES
app.get('/api/services', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        id,
        name,
        category,
        description,
        unit_price,
        min_quantity,
        max_quantity
       FROM services
       WHERE active = true
       ORDER BY id ASC`
    );

    res.json(rows);

  } catch (error) {
    console.error('Services error:', error);

    res.status(500).json({
      error: 'Could not load services.'
    });
  }
});

// GET ORDERS
app.get('/api/orders', async (req, res) => {
  try {
    const userId = Number(req.query.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        error: 'Missing or invalid userId.'
      });
    }

    const { rows } = await pool.query(
      `SELECT
        o.id,
        o.target_url,
        o.quantity,
        o.amount,
        o.status,
        o.created_at,
        s.name AS service_name
       FROM orders o
       JOIN services s ON o.service_id = s.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT 100`,
      [userId]
    );

    res.json(rows);

  } catch (error) {
    console.error('Orders error:', error);

    res.status(500).json({
      error: 'Could not load orders.'
    });
  }
});

// GET WALLET
app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        error: 'Invalid user ID.'
      });
    }

    const { rows } = await pool.query(
      'SELECT balance FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (!rows.length) {
      return res.json({
        balance: '0.00',
        currency: 'INR'
      });
    }

    res.json({
      balance: rows[0].balance,
      currency: 'INR'
    });

  } catch (error) {
    console.error('Wallet error:', error);

    res.status(500).json({
      error: 'Could not load wallet.'
    });
  }
});

// CREATE ORDER
app.post('/api/orders', async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    // DEMO ONLY: Real authentication is not connected here yet.
    const userId = 1;
    const serviceId = 1;

    const targetUrl = req.body?.url;
    const quantity = Number(req.body?.count);

    if (
      typeof targetUrl !== 'string' ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        error: 'Provide a valid URL and positive quantity.'
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return res.status(400).json({
        error: 'Invalid target URL.'
      });
    }

    if (parsedUrl.protocol !== 'https:') {
      return res.status(400).json({
        error: 'Only HTTPS URLs are allowed.'
      });
    }

    await client.query('BEGIN');
    transactionStarted = true;

    const { rows: serviceRows } = await client.query(
      `SELECT *
       FROM services
       WHERE id = $1 AND active = true
       FOR SHARE`,
      [serviceId]
    );

    if (!serviceRows.length) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(404).json({
        error: 'Service not found.'
      });
    }

    const service = serviceRows[0];

    if (
      quantity < service.min_quantity ||
      quantity > service.max_quantity
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        error: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}.`
      });
    }

    const amount = Number(
      (Number(service.unit_price) * quantity).toFixed(2)
    );

    const { rows: walletRows } = await client.query(
      `SELECT balance
       FROM wallets
       WHERE user_id = $1
       FOR UPDATE`,
      [userId]
    );

    if (
      !walletRows.length ||
      Number(walletRows[0].balance) < amount
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(400).json({
        error: 'Insufficient wallet balance.'
      });
    }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
       (user_id, service_id, target_url, quantity, amount)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status, amount, service_id, target_url, quantity`,
      [userId, serviceId, targetUrl, quantity, amount]
    );

    await client.query(
      `UPDATE wallets
       SET balance = balance - $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [amount, userId]
    );

    await client.query(
      `INSERT INTO wallet_transactions
       (user_id, amount, direction, description, reference)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        amount,
        'debit',
        `Order #${orderRows[0].id}`,
        String(orderRows[0].id)
      ]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    res.status(201).json({
      ...orderRows[0],
      note: 'Order saved locally. Provider dispatch is not configured yet.'
    });

  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }

    console.error('Create order error:', error);

    res.status(500).json({
      error: 'Could not create order.'
    });

  } finally {
    client.release();
  }
});

// ADMIN SUMMARY
app.get('/api/admin/summary', async (req, res) => {
  try {
    const [users, orders, services] = await Promise.all([
      pool.query(
        'SELECT COUNT(*)::int AS count FROM users'
      ),
      pool.query(
        'SELECT COUNT(*)::int AS count FROM orders'
      ),
      pool.query(
        'SELECT COUNT(*)::int AS count FROM services WHERE active = true'
      )
    ]);

    res.json({
      users: users.rows[0].count,
      orders: orders.rows[0].count,
      activeServices: services.rows[0].count
    });

  } catch (error) {
    console.error('Admin summary error:', error);

    res.status(500).json({
      error: 'Could not load admin summary.'
    });
  }
});

// START SERVER
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Sohel SMM API running on port ${port}`);
});
