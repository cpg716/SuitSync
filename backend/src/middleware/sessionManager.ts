import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const sessionSizeManager = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Limit session to essential data only
    if (req.session && req.sessionID) {
      const sessionData = JSON.stringify(req.session);
      const sessionSize = Buffer.byteLength(sessionData, 'utf8');
      
      if (sessionSize > 1024) { // 1KB limit
        // Keep only essential session data
        const essential = {
          lightspeedUser: req.session.lightspeedUser,
          lsAccessToken: req.session.lsAccessToken,
          lsRefreshToken: req.session.lsRefreshToken,
          lsDomainPrefix: req.session.lsDomainPrefix,
          lsAccountID: req.session.lsAccountID,
          activeUserId: req.session.activeUserId,
          lsAuthState: req.session.lsAuthState, // Preserve OAuth state
        };
        
        // Clear and restore
        Object.keys(req.session).forEach(key => {
          if (key !== 'id' && key !== 'cookie') {
            delete (req.session as any)[key];
          }
        });
        
        Object.assign(req.session, essential);
        
        logger.warn('Session size reduced', { 
          originalSize: sessionSize, 
          newSize: Buffer.byteLength(JSON.stringify(req.session), 'utf8') 
        });
      }
    }
    next();
  };
};