import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { loggerConfig } from '../config/logger';

const { combine, timestamp, printf, colorize } = winston.format;

const createModuleLogger = (moduleName: string) => {
  const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${moduleName}] ${level}: ${message}`;
  });

  return winston.createLogger({
    level: loggerConfig.logLevel,
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    defaultMeta: { module: moduleName },
    transports: [
      new winston.transports.Console({
        format: combine(
            colorize(),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat
        ),
      }),
      new winston.transports.DailyRotateFile({
        filename: path.join(loggerConfig.logPath, `${moduleName}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        maxSize: loggerConfig.maxFileSize,
        maxFiles: loggerConfig.maxFiles,
        format: logFormat,
      }),
    ],
  });
};

const logger = createModuleLogger('app');

export { createModuleLogger };
export default logger;
