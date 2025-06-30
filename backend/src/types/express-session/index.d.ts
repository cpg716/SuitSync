import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    lsAccessToken?: string;
    lsRefreshToken?: string;
    lsDomainPrefix?: string;
    lsAuthState?: string;
    lastLightspeedSync?: string;
    // Add other custom session properties as needed
  }
}