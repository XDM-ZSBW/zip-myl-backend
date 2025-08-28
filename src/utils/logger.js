const winston = require('winston');
const config = require('./config');

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    config.NODE_ENV === 'development'
      ? combine(colorize(), devFormat)
      : json(),
  ),
  defaultMeta: {
    service: 'myl-zip-backend',
    version: '1.0.0',
  },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

// Add file transport in production
if (config.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));
}

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.Console({
    format: combine(
      timestamp(),
      errors({ stack: true }),
      json(),
    ),
  }),
);

logger.rejections.handle(
  new winston.transports.Console({
    format: combine(
      timestamp(),
      errors({ stack: true }),
      json(),
    ),
  }),
);

module.exports = logger;
