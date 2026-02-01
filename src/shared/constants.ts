export enum RateLimitType {
  AUTH = 'auth',
  CHAT = 'chat',
  SUBSCRIPTION = 'subscription'
}

export enum UserRoleName {
  USER = 'user',
  ADMIN = 'admin',
}

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

export const REQUEST_SIZE_LIMIT_DEFAULT = '10kb';
export const REQUEST_SIZE_POINT_DEFAULT = 10;
export const REQUEST_LIMIT_DURATION_DEFAULT = 10;

export const PASSWORD_MIN_LENGTH=8;
export const NAME_MIN_LENGTH=3;

export const NONCE_TIME_DURATION = 5 * 60 * 1000;

export const OATH_GOOGLE_PROVIDER_ID = 'google';

export const SESSION_EXPIRATION_TIME = 24 * 60 * 60 * 1000;

export const CHAT_QUESTION_MAX_LENGTH = 2000;
export const CHAT_QUESTION_MIN_LENGTH = 1;



export const  enum BILLING_CYCLE {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export const enum SUBSCRIPTION_DURATION {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

