import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { config } from './config';
import { wsManager } from './ws';
import { binanceFeed } from './services/binanceFeed';
import { orderbookEngine } from './services/orderbook';
import authRoutes from './routes/auth';
import kycRoutes from './routes/kyc';
import walletRoutes from './routes/wallets';
import orderRoutes from './routes/orders';
import marketsRoutes from './routes/markets';
import marketRoutes from './routes/market';
import tradeRoutes from './routes/trades';
import adminRoutes from './routes/admin';
import investmentRoutes from './routes/investments';
import { distributeDailyReturns } from './services/investmentService';
import { errorHandler } from './middleware/errorHandler';

const log = {
  info: (msg: string, data?: Record<string, unknown>) => {
    process.stdout.write(JSON.stringify({ level: 'info', ts: new Date().toISOString(), msg, ...data }) + '\n');
  },
  error: (msg: string, err?: unknown) => {
    const extra = err instanceof Error ? { error: err.message, stack: err.stack } : {};
    process.stderr.write(JSON.stringify({ level: 'error', ts: new Date().toISOString(), msg, ...extra }) + '\n');
  },
};

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting — apply to /api/ paths
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Auth rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/markets', marketsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/investments', investmentRoutes);

// Error handler
app.use(errorHandler);

// Initialize WebSocket
wsManager.init(server);

// Start
async function start(): Promise<void> {
  try {
    // Load open orders into order book
    await orderbookEngine.loadOpenOrders();

    // Connect to Binance price feed
    binanceFeed.connect();

    // Start server
    server.listen(config.port, () => {
      log.info('Server started', { port: config.port, env: config.nodeEnv, network: config.network });
    });

    // Daily returns distribution — run every 60 minutes
    setInterval(() => {
      const start = Date.now();
      distributeDailyReturns()
        .then((result) => {
          log.info('Daily returns distributed', { updated: result.updated, durationMs: Date.now() - start });
        })
        .catch((err) => {
          log.error('Daily returns distribution failed', err);
        });
    }, 60 * 60 * 1000);

    // Run once on startup after a short delay
    setTimeout(() => {
      log.info('Running initial daily returns distribution');
      distributeDailyReturns()
        .then((result) => {
          log.info('Initial daily returns complete', { updated: result.updated });
        })
        .catch((err) => {
          log.error('Initial daily returns failed', err);
        });
    }, 10_000);
  } catch (err) {
    log.error('Failed to start server', err);
    process.exit(1);
  }
}

function shutdown(signal: string): void {
  log.info('Shutdown signal received', { signal });
  binanceFeed.disconnect();
  wsManager.shutdown();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();

export { app, server };
