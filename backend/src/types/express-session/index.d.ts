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
    userId?: number | string; // Support both number (legacy) and string (Lightspeed IDs)
    lsAccessToken?: string;
    lsRefreshToken?: string;
    lsDomainPrefix?: string;
    lsTokenExpiresAt?: Date;

    // Pure Lightspeed user data (no local database)
    lightspeedUser?: {
      id: string;
      name: string;
      email: string;
      role: string;
      photoUrl?: string;
      lightspeedEmployeeId: string;
      isLightspeedUser: boolean;
    };

    // Multi-user session support (legacy)
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