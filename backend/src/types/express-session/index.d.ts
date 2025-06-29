import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    lsAccessToken?: string;
    lsRefreshToken?: string;
    // Add other custom session properties as needed
  }
} 