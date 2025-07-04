import 'express-session';

declare module 'express-session' {
  interface SessionData {
    lsAccountID?: string | number;
    lsDomainPrefix?: string;
    lsAccessToken?: string;
    lsRefreshToken?: string;
    lsTokenExpiresAt?: Date;
    lightspeedUser?: any;
    userId?: string | number;
    lsAuthState?: string;
    activeUserId?: string | number;
    userSessions?: any;
  }
}