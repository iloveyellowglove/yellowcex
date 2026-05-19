# YellowCEX

Full-stack cryptocurrency exchange — **testnet by default**.

## Architecture

```
yellowcex/
├── backend/          # Node.js + Express REST API + WebSocket
├── frontend/         # Next.js 14 trading UI
├── admin/            # Next.js admin panel
├── shared/           # Shared TypeScript types
├── .env.example      # Environment variables template
├── vercel.json       # Frontend deployment config
└── railway.json      # Backend deployment config
```

## Features

- **Custodial HD Wallets** — ethers.js (ETH/ERC-20) + bitcoinjs-lib (BTC)
- **In-Memory Order Book** — matching engine with limit and market orders
- **Live Prices** — Binance WebSocket feed for 9 trading pairs
- **KYC Verification** — ID document upload to Supabase Storage
- **Admin Panel** — user management, KYC review, order monitoring
- **Real-Time Updates** — WebSocket server for prices, order book, trades

### Trading Pairs

BTC/USDT · ETH/USDT · BNB/USDT · SOL/USDT · XRP/USDT · ADA/USDT · DOGE/USDT · MATIC/USDT · BTC/ETH

## Quick Start

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) project (free tier works)
- Infura or Alchemy API key (for Ethereum RPC)

### 1. Clone & Install

```bash
git clone https://github.com/iloveyellowglove/yellowcex.git
cd yellowcex

# Install all dependencies
npm install
cd shared && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd admin && npm install && cd ..
```

### 2. Set up Supabase

1. Create a new Supabase project
2. Go to SQL Editor and run the contents of `backend/src/db/schema.sql`
3. Create a Storage bucket named `kyc-documents` (public)
4. Copy your Supabase URL, anon key, and service role key

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Supabase credentials and other settings
```

Required variables:
- `SUPABASE_URL` — Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (for backend operations)
- `HD_WALLET_MNEMONIC` — 12-word BIP39 mnemonic for HD wallet derivation

### 4. Run

```bash
# Start backend (port 4000)
cd backend && npm run dev

# Start frontend (port 3000) — in another terminal
cd frontend && npm run dev

# Start admin panel (port 3001) — in another terminal
cd admin && npm run dev

# Or run all at once from root:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the trading UI.
Open [http://localhost:3001](http://localhost:3001) for the admin panel.

## API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `POST /api/auth/google` — Google OAuth login
- `GET /api/auth/me` — Get current user
- `PUT /api/auth/profile` — Update profile

### Markets
- `GET /api/markets` — All market summaries
- `GET /api/markets/:pair` — Single market data

### Orders
- `POST /api/orders` — Place order
- `GET /api/orders` — List user orders
- `GET /api/orders/:id` — Get order by ID
- `DELETE /api/orders/:id` — Cancel order
- `GET /api/orders/book/:pair` — Get order book

### Wallets
- `GET /api/wallets` — Get wallets and balances
- `GET /api/wallets/:currency/address` — Get deposit address
- `GET /api/wallets/:currency/balance` — Get balance
- `POST /api/wallets/withdraw` — Request withdrawal
- `GET /api/wallets/transactions` — Transaction history

### KYC
- `POST /api/kyc/submit` — Upload ID document
- `GET /api/kyc/status` — Get KYC status

### Trades
- `GET /api/trades` — Recent trades
- `GET /api/trades/my` — User trade history

### Admin
- `GET /api/admin/users` — List users
- `GET /api/admin/users/:id` — User detail
- `GET /api/admin/kyc` — Pending KYC documents
- `PUT /api/admin/kyc/:id` — Review KYC
- `GET /api/admin/orders` — All orders

### WebSocket

Connect to `ws://localhost:4000/ws?token=YOUR_JWT`

Events:
- `price_update` — Live price changes
- `orderbook_update` — Order book snapshots (1s interval)
- `trade_update` — Trade executions
- `order_update` — User order status changes

## Switching to Mainnet

Set these in `.env`:

```bash
NETWORK=mainnet
BINANCE_WS_URL=wss://stream.binance.com
BINANCE_REST_URL=https://api.binance.com
ETH_RPC=https://mainnet.infura.io/v3/your-key
```

## Deployment

### Frontend (Vercel)
```bash
# Configure vercel.json with your backend URL
cd frontend && vercel deploy
```

### Backend (Railway)
```bash
# railway.json handles the build and start commands
railway up
```

### Admin (Vercel)
```bash
cd admin && vercel deploy
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + bcrypt |
| Blockchain | ethers.js v6, bitcoinjs-lib v6 |
| Realtime | WebSocket (ws), Binance WS feeds |
| KYC Storage | Supabase Storage |
| Deployment | Vercel (frontend), Railway (backend) |

## Security

- Helmet.js security headers
- Rate limiting (100 req/15min general, 20 req/15min auth)
- JWT authentication on all protected routes
- Row Level Security in Supabase
- CORS whitelisting
- Input validation with Zod
- HD wallet mnemonics never exposed via API

## License

MIT
