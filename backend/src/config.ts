import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function requireEnvInProduction(key: string, devDefault: string): string {
  if (process.env.NODE_ENV === 'production') {
    return requireEnv(key);
  }
  return process.env[key] || devDefault;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  network: process.env.NETWORK || 'testnet',

  supabase: {
    url: requireEnv('SUPABASE_URL'),
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },

  jwt: {
    secret: requireEnvInProduction('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  binance: {
    wsUrl: process.env.BINANCE_WS_URL || 'wss://stream.testnet.binance.vision:9443/ws',
    restUrl: process.env.BINANCE_REST_URL || 'https://testnet.binance.vision',
    isTestnet: !process.env.NETWORK || process.env.NETWORK === 'testnet',
  },

  ethereum: {
    rpc: process.env.ETH_RPC || 'https://sepolia.infura.io/v3/your-key',
  },

  encryption: {
    secret: requireEnvInProduction('ENCRYPTION_SECRET', 'dev-encryption-key-change-in-production'),
  },

  hdWallet: {
    mnemonic: process.env.HD_WALLET_MNEMONIC
      ? process.env.HD_WALLET_MNEMONIC
      : process.env.NODE_ENV === 'production'
        ? (() => { throw new Error('HD_WALLET_MNEMONIC must be set in production'); })()
        : 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  },

  plisio: {
    secretKey: requireEnv('PLISIO_SECRET_KEY'),
    apiUrl: process.env.PLISIO_API_URL || 'https://plisio.net/api/v1',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};

export type Config = typeof config;
