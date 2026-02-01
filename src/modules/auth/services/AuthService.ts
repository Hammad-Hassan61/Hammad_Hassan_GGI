import { AppDataSource } from '../../../config/database';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { UserOAuth } from '../entities/UserOAuth';
import { OAuthProvider } from '../entities/OAuthProvider';
import { UserSession } from '../entities/UserSession';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import {SESSION_EXPIRATION_TIME, OATH_GOOGLE_PROVIDER_ID, UserRoleName} from '../../../shared/constants';
import { AppError } from '../../../shared/errors';
import { HttpStatus } from '../../../shared/constants';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  private roleRepository = AppDataSource.getRepository(Role);
  private oauthProviderRepository = AppDataSource.getRepository(OAuthProvider);
  private userOAuthRepository = AppDataSource.getRepository(UserOAuth);

  async signUp(email: string, passwordHash: string, name: string) {
    const existingUser = await this.userRepository.findOneBy({ email });
    if (existingUser) {
      throw new AppError('User already exists', HttpStatus.BAD_REQUEST);
    }

    const userRole = await this.roleRepository.findOneBy({ name: UserRoleName.USER });
    if (!userRole) {
      throw new AppError('Default role not found', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const hashedPassword = await bcrypt.hash(passwordHash, 10);

    const user = new User();
    user.email = email;
    user.passwordHash = hashedPassword;
    user.name = name;
    user.role = userRole;

    await this.userRepository.save(user);
    return this.generateToken(user);
  }

  async login(email: string, passwordHash: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const isPasswordValid = await bcrypt.compare(passwordHash, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    user.lastLoggedIn = new Date();
    await this.userRepository.save(user);

    return this.generateToken(user);
  }

  async loginWithGoogle(idToken: string) {
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (error) {
         throw new AppError('Invalid Google token', HttpStatus.UNAUTHORIZED);
    }

    if (!payload || !payload.email) {
      throw new AppError('Invalid Google token payload', HttpStatus.UNAUTHORIZED);
    }

    let user = await this.userRepository.findOne({
      where: { email: payload.email },
      relations: ['role'],
    });

    if (!user) {
      const userRole = await this.roleRepository.findOneBy({ name: UserRoleName.USER });
      user = new User();
      user.email = payload.email;
      user.name = payload.name;
      user.role = userRole!;
      await this.userRepository.save(user);
    }

    const provider = await this.oauthProviderRepository.findOneBy({ id: OATH_GOOGLE_PROVIDER_ID });
    if (provider) {
        let userOAuth = await this.userOAuthRepository.findOne({
            where: { user: { id: user.id }, provider: { id: OATH_GOOGLE_PROVIDER_ID } }
        });
        if (!userOAuth) {
            userOAuth = new UserOAuth();
            userOAuth.user = user;
            userOAuth.provider = provider;
            userOAuth.providerUserId = payload.sub;
            await this.userOAuthRepository.save(userOAuth);
        }
    }

    user.lastLoggedIn = new Date();
    await this.userRepository.save(user);

    return this.generateToken(user);
  }

  private generateToken(user: User) {
    const sid = uuidv4();

    const session = new UserSession();
    session.user = user;
    session.sid = sid;
    session.expiresAt = new Date(Date.now() + SESSION_EXPIRATION_TIME );
    AppDataSource.getRepository(UserSession).save(session);

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roleId: user.role.id,
        roleName: user.role.name,
        sid: sid,
      },
      process.env.JWT_SECRET,
        {
          expiresIn: SESSION_EXPIRATION_TIME,
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE
        }
        );

    return { token, sid, user: { id: user.id, email: user.email, name: user.name, role: user.role.name } };
  }

  async getUserInfo(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role']
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      isActive: user.isActive,
      lastLoggedIn: user.lastLoggedIn,
      freeMessagesUsedThisMonth: user.freeMessagesUsedThisMonth,
      createdAt: user.createdAt
    };
  }
}