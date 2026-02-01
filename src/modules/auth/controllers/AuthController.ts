import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { z } from 'zod';
import {HttpStatus, NAME_MIN_LENGTH, PASSWORD_MIN_LENGTH} from '../../../shared/constants';
import { createModuleLogger } from '../../../shared/logger';

const logger = createModuleLogger('auth');

const signUpSchema = z.object({
  email: z.email(),
  password: z.string().min(PASSWORD_MIN_LENGTH),
  name: z.string().min(NAME_MIN_LENGTH),
}).strict();

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
}).strict();

const googleLoginSchema = z.object({
  idToken: z.string(),
}).strict();

export class AuthController {
  private authService = new AuthService();

  async signUp(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = signUpSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid input', details: validation.error.format() });
      }

      const { email, password, name } = validation.data;
      const result = await this.authService.signUp(email, password, name);
      
      logger.info(`User signed up: ${email}`);
      return res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid input', details: validation.error.format() });
      }

      const { email, password } = validation.data;
      const result = await this.authService.login(email, password);
      
      logger.info(`User logged in: ${email}`);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  async loginWithGoogle(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = googleLoginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid input', details: validation.error.format() });
      }

      const { idToken } = validation.data;
      const result = await this.authService.loginWithGoogle(idToken);
      
      logger.info(`User logged in with Google: ${result.user.email}`);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: any, res: Response, next: NextFunction) {
    try {
      const user = await this.authService.getUserInfo(req.user!.id);
      return res.status(HttpStatus.OK).json(user);
    } catch (error) {
      next(error);
    }
  }
}