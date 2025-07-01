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

    // Hybrid Lightspeed user data (with optional local database integration)
    lightspeedUser?: {
      id: string | number; // Can be local DB ID (number) or Lightspeed ID (string)
      lightspeedId?: string; // Always the Lightspeed employee ID
      name: string;
      email: string;
      role: string;
      photoUrl?: string;
      lightspeedEmployeeId: string;
      isLightspeedUser: boolean;
      hasLocalRecord?: boolean; // Whether this user has a local database record
      localUserId?: number; // Local database user ID if available
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