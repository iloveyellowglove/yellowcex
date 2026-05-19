import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  network: process.env.NETWORK || 'testnet',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  binance: {
    wsUrl: process.env.BINANCE_WS_URL || 'wss://testnet.binance.vision/ws',
    restUrl: process.env.BINANCE_REST_URL || 'https://testnet.binance.vision',
    isTestnet: !process.env.NETWORK || process.env.NETWORK === 'testnet',
  },

  bitcoin: {
    network: process.env.BITCOIN_NETWORK || 'testnet',
    testnetApiUrl: process.env.BITCOIN_TESTNET_API || 'https://blockstream.info/testnet/api',
  },

  encryption: {
    secret: process.env.ENCRYPTION_SECRET || 'dev-encryption-secret-change-me',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};

export type Config = typeof config;
