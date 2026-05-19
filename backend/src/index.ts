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
import marketRoutes from './routes/markets';
import tradeRoutes from './routes/trades';
import adminRoutes from './routes/admin';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

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
app.use('/api/markets', marketRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/admin', adminRoutes);

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
      console.log(`YellowCEX API running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Network: ${config.network}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  binanceFeed.disconnect();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  binanceFeed.disconnect();
  server.close(() => process.exit(0));
});

start();

export { app, server };
