import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = path.join(__dirname, '../../..', 'logs');
fs.mkdirSync(logDir, { recursive: true });

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});
