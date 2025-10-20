const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/ca_management?authSource=admin',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key-for-development',
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  },

  // Security
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },
};
