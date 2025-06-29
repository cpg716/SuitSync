// types for express-session custom properties
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    lsAccessToken?: string;
    lsRefreshToken?: string;
    lsDomainPrefix?: string;
    lsAuthState?: string | null;
    lastLightspeedSync?: string;
    userId?: string | number;
  }
} 