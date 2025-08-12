// types for express-session custom properties
// Note: Main session types are defined in src/types/express-session/index.d.ts
// This file is kept for backward compatibility

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    // Local user authentication
    userId?: number;
    user?: {
      id: number;
      email: string;
      name: string;
      role: string;
      photoUrl?: string;
      lightspeedEmployeeId?: string;
      isLocalUser: boolean;
    };
    
    // Lightspeed authentication
    lsAccessToken?: string;
    lsRefreshToken?: string;
    lsDomainPrefix?: string;
    lsTokenExpiresAt?: Date;
    lsAuthState?: string;
    
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