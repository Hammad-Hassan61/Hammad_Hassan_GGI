import { DataSource } from 'typeorm';
import { User } from '../modules/auth/entities/User';
import { Role } from '../modules/auth/entities/Role';
import { OAuthProvider } from '../modules/auth/entities/OAuthProvider';
import { UserOAuth } from '../modules/auth/entities/UserOAuth';
import { UserSubscription } from '../modules/subscriptions/entities/UserSubscription';
import { SubscriptionPlan } from '../modules/subscriptions/entities/SubscriptionPlan';
import { UserSubscriptionHistory } from '../modules/subscriptions/entities/UserSubscriptionHistory';
import { ChatSession } from '../modules/chat/entities/ChatSession';
import { ChatMessage } from '../modules/chat/entities/ChatMessage';
import { Permission } from '../modules/auth/entities/Permission';
import { RolePermission } from '../modules/auth/entities/RolePermission';
import { UserSession } from '../modules/auth/entities/UserSession';
import { RateLimitingConfig } from '../shared/entities/RateLimitingConfig';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: process.env.IS_SYNCHRONIZE === 'true',
  logging: process.env.IS_LOGGING === 'true',
  entities: [
    User,
    Role,
    OAuthProvider,
    UserOAuth,
    UserSubscription,
    SubscriptionPlan,
    UserSubscriptionHistory,
    ChatSession,
    ChatMessage,
    Permission,
    RolePermission,
    UserSession,
    RateLimitingConfig,
  ],
  migrations: [],
  subscribers: [],
});
