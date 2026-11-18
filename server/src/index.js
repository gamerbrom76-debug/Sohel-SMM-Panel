import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { pool } from './db.js';
import { submitProviderOrder } from './provider.js';
import authRoutes from './auth.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use('/auth', authRoutes);
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'sohel-smm-api' }));

app.get('/api/services', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id,name,category,description,unit_price,min_quantity,max_quantity FROM services WHERE active=true ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load services.' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const userId = Number(req.query.userId); // Demo identity only; replace after authentication.
    if (!userId) return res.status(400).json({ error: 'Missing userId parameter.' });

    const { rows } = await pool.query(
      `SELECT o.id,o.target_url,o.quantity,o.amount,o.status,o.created_at,s.name AS service_name 
       FROM orders O JOIN services S ON o.id=s.service_id 
       WHERE o.user_id=$1 ORDER BY o.created_at DESC LIMIT 100`, [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load orders.' });
  }
});

app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT balance FROM wallets WHERE user_id=$1', [req.params.userId]);
    if (!rows.length) return res.json({ balance: '0.00', currency: 'INR' });
    res.json({ balance: rows[0].balance, currency: 'INR' });
  } catch (err) {
    res.status(500).json({ error: 'Could not load wallet.' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const userId = 1, serviceId = 1, targetUrl = req.body.url;
    const quantity = Number(req.body.count);

    if (!Number.isInteger(serviceId) || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Provide a valid service, HTTPS target URL and positive quantity.' });
    }

    const { rows: sr } = await pool.query('SELECT * FROM services WHERE id=$1 AND active=true FOR SHARE', [serviceId]);
    if (!sr.length) return res.status(404).json({ error: 'Service not found.' });
    const service = sr[0];
    
    if (quantity < service.min_quantity || quantity > service.max_quantity) {
      return res.status(400).json({ error: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}` });
    }

    const amount = Number((service.unit_price * qty).toFixed(2));
    const { rows: wr } = await pool.query('SELECT balance FROM wallets WHERE user_id=$1 FOR UPDATE', [userId]);
    if (!wr.length || Number(wr[0].balance) < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance. Demo wallet funding is not enabled.' });
    }

    await pool.query('BEGIN');
    const { rows: or } = await pool.query(
      'INSERT INTO orders(user_id,service_id,target_url,quantity,amount) VALUES($1,$2,$3,$4,$5) RETURNING id,status,amount,service_id,target_url,quantity',
      [userId, serviceId, targetUrl, qty, amount]
    );

    await pool.query('UPDATE wallets SET balance=balance-$1,updated_at=NOW() WHERE user_id=$2', [amount, userId]);
    await pool.query('INSERT INTO wallet_transactions(user_id,amount,direction,description,reference) VALUES($1,$2,$3,$4,$5)',
      [userId, amount, 'debit', `Order #${or[0].id}`, or[0].id]
    );
    await pool.query('COMMIT');
    res.status(201).json({ ...or[0], note: 'Saved locally. Provider dispatch is not configured.' });
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Could not create order.' });
  }
});

app.get('/api/admin/summary', async (req, res) => {
  try {
    const [users, orders, services] = await Promise.all([
      pool.query('SELECT COUNT(*) ::int AS count FROM users'),
      pool.query('SELECT COUNT(*) ::int AS count FROM orders'),
      pool.query('SELECT COUNT(*) ::int AS count FROM services WHERE active=true')
    ]);
    res.json({ users: users.rows[0].count, orders: orders.rows[0].count, activeServices: services.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: 'Could not load admin summary.' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Listening on ${port}`));
