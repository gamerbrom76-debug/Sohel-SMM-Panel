# Sohel SMM Panel — Starter Project

A responsive React + Tailwind dashboard and Express + PostgreSQL backend starter.
This is a **working foundation**, not a finished 150-feature production platform.

## Included
- Responsive customer dashboard with icon-and-label navigation
- Service catalogue and new-order form
- Order history and status display
- Wallet balance view and transaction ledger schema
- Admin overview and service-management starter screen
- Express API with health, services, orders, wallet, and admin routes
- PostgreSQL schema with users, services, orders, wallets, transactions
- Provider adapter placeholder for a future, authorized provider API integration
- Render deployment blueprint

## Requirements
- Node.js 20+
- PostgreSQL database
- Git and a GitHub account for deployment

## Run locally

### 1. Backend
```bash
cd server
cp .env.example .env
npm install
# Create a PostgreSQL database and set DATABASE_URL in .env
npm run db:init
npm run dev
```
Backend runs at `http://localhost:4000`.

### 2. Frontend
In another terminal:
```bash
cd client
npm install
cp .env.example .env
npm run dev
```
Frontend runs at `http://localhost:5173`.

The frontend uses demo data unless `VITE_API_URL` points to the backend. The API currently exposes read endpoints and a basic order-creation endpoint. Authentication, payment processing, provider credentials, and production controls must be completed before accepting real customers or money.

## Render deployment
1. Push this project to a private GitHub repository.
2. In Render, create a PostgreSQL database.
3. Create a Web Service from the repository, root directory `server`, build command `npm install`, start command `npm start`.
4. Set `DATABASE_URL` from the Render database, `NODE_ENV=production`, and a strong `SESSION_SECRET`.
5. Create a Static Site from the same repository, root directory `client`, build command `npm install && npm run build`, publish directory `dist`.
6. Set `VITE_API_URL` to your backend URL (for example `https://your-api.onrender.com`).
7. Update CORS settings in `server/src/index.js` to allow only your deployed frontend domain.

You can also use the included `render.yaml` as a starting blueprint; review its environment settings before deploying.

## Important production checklist
- Implement real authentication (hashed passwords, secure sessions, CSRF protection, rate limits).
- Add admin authorization and role-based access control. The starter admin page is a UI scaffold only.
- Never expose provider API keys in browser code. Store them as server-side environment secrets.
- Integrate a payment gateway using verified server-side webhooks; never credit a wallet from a browser redirect alone.
- Use database transactions and idempotency keys for wallet/order operations.
- Offer only services permitted by the relevant social platforms and providers. Do not sell fake engagement or promise guaranteed followers/views.
- Add validation, audit logs, backups, monitoring, privacy policy, terms, and legal review.
