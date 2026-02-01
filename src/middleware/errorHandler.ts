import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import logger from '../shared/logger';
import { HttpStatus } from '../shared/constants';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err instanceof AppError ? err.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';

  logger.error({
    requestId: req.headers['x-request-id'],
    userId: (req as any).user?.id,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
  });
};
