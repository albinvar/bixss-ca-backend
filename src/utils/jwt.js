const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Generate access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expire,
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire,
  });
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Generate both access and refresh tokens
 */
const generateTokens = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    company: user.company,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user._id });

  return {
    accessToken,
    refreshToken,
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokens,
};
