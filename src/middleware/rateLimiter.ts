import {  Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { AppDataSource } from '../config/database';
import { RateLimitingConfig } from '../shared/entities/RateLimitingConfig';
import {
  HttpStatus,
  REQUEST_SIZE_POINT_DEFAULT,
  RateLimitType,
  REQUEST_LIMIT_DURATION_DEFAULT,
  REQUEST_SIZE_LIMIT_DEFAULT
} from '../shared/constants';
import express from 'express';

const limiters = new Map<string, RateLimiterMemory>();

const getConfig = async (type: string): Promise<{ points: number; duration: number; maxRequestSize: string }> => {
  let points = REQUEST_SIZE_POINT_DEFAULT;
  let duration = REQUEST_LIMIT_DURATION_DEFAULT;
  let maxRequestSize = REQUEST_SIZE_LIMIT_DEFAULT;

  try {
    const config = await AppDataSource.getRepository(RateLimitingConfig).findOneBy({ applyTo: type });
    if (config) {
      points = config.points;
      duration = config.duration;
      maxRequestSize = config.maxRequestSize;
    }
  } catch (error) {
    console.error(`Error fetching rate limit config for ${type}:`, error);
  }

  return { points, duration, maxRequestSize };
};

export const rateLimiterMiddleware = (type: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    const { points, duration, maxRequestSize } = await getConfig(type);

    express.json({ limit: maxRequestSize })(req, res, async (err) => {
      if (err) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Payload too large', limit: maxRequestSize });
      }

      if (!limiters.has(type)) {
        limiters.set(type, new RateLimiterMemory({ points, duration }));
      }
      const limiter = limiters.get(type)!;

      // Use User ID if authenticated, else use IP
      const key = req.user?.id || req.ip;
      try {
        await limiter.consume(key);
        next();
      } catch (rej) {
        res.status(HttpStatus.TOO_MANY_REQUESTS).json({ error: 'Too Many Requests' });
      }
    });
  };
};

export const authRateLimiter = RateLimitType.AUTH;
export const chatRateLimiter = RateLimitType.CHAT;
export const subRateLimiter = RateLimitType.SUBSCRIPTION;
