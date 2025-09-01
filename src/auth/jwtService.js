const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

class JWTService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload) {
    try {
      const tokenPayload = {
        ...payload,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID(), // JWT ID for token tracking
      };

      return jwt.sign(tokenPayload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        algorithm: 'HS256',
      });
    } catch (error) {
      logger.error('Error generating access token', { error: error.message });
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload) {
    try {
      const tokenPayload = {
        ...payload,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID(),
      };

      return jwt.sign(tokenPayload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiry,
        algorithm: 'HS256',
      });
    } catch (error) {
      logger.error('Error generating refresh token', { error: error.message });
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ['HS256'],
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return {
        valid: true,
        payload: decoded,
      };
    } catch (error) {
      logger.error('Error verifying access token', { error: error.message });
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ['HS256'],
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return {
        valid: true,
        payload: decoded,
      };
    } catch (error) {
      logger.error('Error verifying refresh token', { error: error.message });
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error('Error decoding token', { error: error.message });
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      logger.error('Error getting token expiration', { error: error.message });
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    try {
      const expiration = this.getTokenExpiration(token);
      if (!expiration) return true;
      return expiration < new Date();
    } catch (error) {
      logger.error('Error checking token expiration', { error: error.message });
      return true;
    }
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(payload) {
    try {
      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      return {
        accessToken,
        refreshToken,
        expiresIn: this.getExpiryInSeconds(this.accessTokenExpiry),
        refreshExpiresIn: this.getExpiryInSeconds(this.refreshTokenExpiry),
      };
    } catch (error) {
      logger.error('Error generating token pair', { error: error.message });
      throw new Error('Failed to generate token pair');
    }
  }

  /**
   * Convert expiry string to seconds
   */
  getExpiryInSeconds(expiry) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const [, value, unit] = match;
    return parseInt(value, 10) * units[unit];
  }

  /**
   * Create token with custom expiry
   */
  createTokenWithExpiry(payload, expiresIn) {
    try {
      const tokenPayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID(),
      };

      return jwt.sign(tokenPayload, this.accessTokenSecret, {
        expiresIn,
        algorithm: 'HS256',
      });
    } catch (error) {
      logger.error('Error creating token with custom expiry', { error: error.message });
      throw new Error('Failed to create token');
    }
  }

  /**
   * Validate token structure
   */
  validateTokenStructure(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' };
      }

      const [header, payload, signature] = parts;

      // Check if all parts are base64 encoded
      try {
        JSON.parse(Buffer.from(header, 'base64url').toString());
        JSON.parse(Buffer.from(payload, 'base64url').toString());
      } catch (error) {
        return { valid: false, error: 'Invalid token encoding' };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Error validating token structure', { error: error.message });
      return { valid: false, error: 'Token validation failed' };
    }
  }
}

module.exports = new JWTService();
