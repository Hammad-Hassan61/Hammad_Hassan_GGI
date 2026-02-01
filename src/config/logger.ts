import dotenv from 'dotenv';

dotenv.config();

export const loggerConfig = {
  logPath: 'logs',
  maxFileSize: '10m',
  logLevel: 'info',
  maxFiles: '14d',
};
