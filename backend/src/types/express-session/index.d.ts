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
    // Lightspeed authentication
    lsAccessToken?: string;
    lsRefreshToken?: string;
    lsDomainPrefix?: string;
    lsTokenExpiresAt?: Date;
    lsAuthState?: string;
    userId?: string;
    
    // Lightspeed user data
    lightspeedUser?: {
      id: string;
      lightspeedId: string;
      email: string;
      name: string;
      role: string;
      lightspeedEmployeeId: string;
      photoUrl?: string;
      hasLocalRecord: boolean;
      localUserId?: number;
    };
    
    // User selection (PC version)
    selectedUserId?: string;
    selectedUser?: {
      id: string;
      name: string;
      email: string;
      role: string;
      photoUrl?: string;
    };
    
    // Multi-user session support (legacy)
    activeUserId?: string | number;
    userSessions?: {
      [key: string]: {
        lsAccessToken: string;
        lsRefreshToken: string;
        lsDomainPrefix: string;
        expiresAt: Date;
        lastActive: Date;
        loginTime: Date;
      };
    };

    // Legacy properties for backward compatibility
    lastLightspeedSync?: string;
    maxCachedUsers?: number;
  }
}