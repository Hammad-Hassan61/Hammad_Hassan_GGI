import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { RolePermission } from '../modules/auth/entities/RolePermission';
import { UserSession } from '../modules/auth/entities/UserSession';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';
import { createModuleLogger } from '../shared/logger';
import { NONCE_TIME_DURATION} from "../shared/constants";

const logger = createModuleLogger('auth');

export interface AuthenticatedRequest extends Request {
  rawBody?: string;
  user?: {
    id: string ;
    email: string;
    roleId: string;
    roleName: string;
    sessionId?: string;
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid token'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    }) as any;

    // Session-bound token check
    const session = await AppDataSource.getRepository(UserSession).findOne({
      where: { sid: decoded.sid, user: { id: decoded.sub }, isActive: true }
    });

    if (!session || session.expiresAt < new Date()) {
      logger.warn(`Invalid or expired session ${decoded.sid} for user ${decoded.sub}`);
      return next(new UnauthorizedError('Invalid session'));
    }

    const timestamp = req.headers['x-request-timestamp'] as string;
    const nonce = req.headers['x-request-nonce'] as string;

    if (!timestamp || !nonce) {
      logger.warn(`Missing timestamp or nonce for user ${decoded.sub}`);
      return next(new UnauthorizedError('Missing security headers'));
    }

    const now = Date.now();
    const requestTime = parseInt(timestamp);
    // TODO: NONCE should be store in a cache to prevent replay attacks
    if (isNaN(requestTime) || Math.abs(now - requestTime) > NONCE_TIME_DURATION) {
      logger.warn(`Expired or invalid timestamp for user ${decoded.sub}: ${timestamp}`);
      return next(new UnauthorizedError('Request timestamp expired or invalid'));
    }


    req.user = {
      id: decoded.sub,
      email: decoded.email,
      roleId: decoded.roleId,
      roleName: decoded.roleName,
      sessionId: decoded.sid,
    };
    next();
  } catch (err) {
    return next(new UnauthorizedError('Invalid token'));
  }
};

export const authorize = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const { roleId } = req.user;
    let path = req.path;
    // const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    // path = path.replace(uuidRegex, ':id');
    const permissionName = `${req.method}:${req.baseUrl}${req.route.path}`;
    // const permissionName = `${req.method}:${req.baseUrl}${path}`;

    try {
      const permission = await AppDataSource.getRepository(RolePermission).findOne({
        where: {
          role: { id: roleId },
          permission: { name: permissionName },
        },
      });

      if (!permission) {
        logger.warn(`Permission denied for role ${req.user.roleName} on ${permissionName}`);
        return next(new ForbiddenError('Insufficient permissions'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
