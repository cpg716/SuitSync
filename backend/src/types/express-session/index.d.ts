import 'express-session';

interface UserSessionData {
  lsAccessToken: string;
  lsRefreshToken: string;
  lsDomainPrefix: string;
  expiresAt: Date;
  lastActive: Date;
  loginTime: Date;
}

declare module 'express-session' {
  interface SessionData {
    // Current active user (for backward compatibility)
    userId?: number;
    lsAccessToken?: string;
    lsRefreshToken?: string;
    lsDomainPrefix?: string;

    // Multi-user session support
    activeUserId?: number;
    userSessions?: {
      [userId: number]: UserSessionData;
    };

    // OAuth and sync state
    lsAuthState?: string;
    lastLightspeedSync?: string;

    // Session configuration
    maxCachedUsers?: number;

    // Add other custom session properties as needed
  }
}