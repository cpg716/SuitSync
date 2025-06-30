import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import logger from '../utils/logger';

// Enhanced rate limiting configurations
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });
      
      res.status(429).json({
        error: options.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  });
};

// Different rate limits for different endpoints
export const rateLimits = {
  // General API rate limit
  general: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
  }),

  // Strict rate limit for authentication endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true,
  }),

  // Rate limit for password reset
  passwordReset: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
    message: 'Too many password reset attempts, please try again later.',
  }),

  // Rate limit for data creation endpoints
  create: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 creates per minute
    message: 'Too many creation requests, please slow down.',
  }),

  // Rate limit for sync operations
  sync: createRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 sync operations per 5 minutes
    message: 'Too many sync requests, please wait before trying again.',
  }),

  // Rate limit for file uploads
  upload: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
    message: 'Too many upload requests, please slow down.',
  }),
};

// Speed limiting (progressive delays)
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  validate: { delayMs: false }, // Disable warning
});

// Enhanced helmet configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// Request size limiting middleware
export const requestSizeLimit = (maxSize: number = 10 * 1024 * 1024) => { // 10MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);

    if (contentLength > maxSize) {
      logger.warn('Request size limit exceeded', {
        ip: req.ip,
        contentLength,
        maxSize,
        path: req.path,
      });

      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: `${Math.round(maxSize / 1024 / 1024)}MB`,
      });
    }

    next();
  };
};

// Session size limiting middleware to prevent 431 errors
export const sessionSizeLimit = (maxSessionSize: number = 4 * 1024) => { // 4KB default (safe for most browsers)
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if session exists and estimate its size
    if (req.session && Object.keys(req.session).length > 0) {
      try {
        const sessionData = JSON.stringify(req.session);
        const sessionSize = Buffer.byteLength(sessionData, 'utf8');

        if (sessionSize > maxSessionSize) {
          logger.warn('Session size limit exceeded', {
            ip: req.ip,
            sessionSize,
            maxSessionSize,
            path: req.path,
            sessionKeys: Object.keys(req.session),
          });

          // Clean up large session data to prevent 431 errors
          if (req.session.userSessions) {
            const userSessions = Object.entries(req.session.userSessions);
            if (userSessions.length > 3) {
              // Keep only the 3 most recently active sessions
              userSessions.sort(([, a], [, b]) => b.lastActive.getTime() - a.lastActive.getTime());
              const sessionsToKeep = userSessions.slice(0, 3);
              req.session.userSessions = Object.fromEntries(sessionsToKeep);

              logger.info('Cleaned up session data to prevent header size issues', {
                ip: req.ip,
                originalSessionCount: userSessions.length,
                keptSessionCount: sessionsToKeep.length,
              });
            }
          }

          // If still too large, clear non-essential session data
          const newSessionData = JSON.stringify(req.session);
          const newSessionSize = Buffer.byteLength(newSessionData, 'utf8');
          if (newSessionSize > maxSessionSize) {
            // Keep only essential session data
            const essentialData = {
              activeUserId: req.session.activeUserId,
              userId: req.session.userId,
              lsAccessToken: req.session.lsAccessToken,
              lsRefreshToken: req.session.lsRefreshToken,
              lsDomainPrefix: req.session.lsDomainPrefix,
            };

            // Clear all session data and restore only essential data
            Object.keys(req.session).forEach(key => {
              if (key !== 'id' && key !== 'cookie') {
                delete (req.session as any)[key];
              }
            });

            Object.assign(req.session, essentialData);

            logger.warn('Performed aggressive session cleanup due to size limit', {
              ip: req.ip,
              originalSize: sessionSize,
              newSize: Buffer.byteLength(JSON.stringify(req.session), 'utf8'),
            });
          }
        }
      } catch (error) {
        logger.error('Error checking session size:', error);
      }
    }

    next();
  };
};

// Header size monitoring middleware to prevent 431 errors
export const headerSizeMonitor = (maxHeaderSize: number = 8 * 1024) => { // 8KB default
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Calculate total header size
      const headerString = Object.entries(req.headers)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join('\r\n');

      const headerSize = Buffer.byteLength(headerString, 'utf8');

      if (headerSize > maxHeaderSize) {
        logger.warn('Large request headers detected', {
          ip: req.ip,
          headerSize,
          maxHeaderSize,
          path: req.path,
          userAgent: req.get('User-Agent')?.substring(0, 100),
        });

        // Return 431 with helpful message
        return res.status(431).json({
          error: 'Request header fields too large',
          message: 'Your session data has grown too large. Please clear your session and try again.',
          headerSize,
          maxHeaderSize,
          clearSessionUrl: '/api/auth/clear-session'
        });
      }
    } catch (error) {
      logger.error('Error checking header size:', error);
    }

    next();
  };
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP || '')) {
      logger.warn('IP not in whitelist', {
        ip: clientIP,
        allowedIPs,
        path: req.path,
      });
      
      return res.status(403).json({
        error: 'Access denied from this IP address',
      });
    }
    
    next();
  };
};

// Request logging middleware with security focus
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./,           // Directory traversal
    /<script/i,       // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i,   // JavaScript protocol
    /vbscript:/i,     // VBScript protocol
  ];
  
  const url = req.originalUrl || req.url;
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(userAgent) || pattern.test(referer)
  );
  
  if (isSuspicious) {
    logger.warn('Suspicious request detected', {
      ip: req.ip,
      method: req.method,
      url,
      userAgent,
      referer,
      body: req.method === 'POST' ? req.body : undefined,
    });
  }
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP error response', {
        ip: req.ip,
        method: req.method,
        url,
        statusCode: res.statusCode,
        duration,
        userAgent,
      });
    }
  });
  
  next();
};

// CORS security middleware
export const corsSecurityCheck = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3001',
    'https://localhost:3001',
  ].filter(Boolean);
  
  if (origin && !allowedOrigins.includes(origin)) {
    logger.warn('CORS violation detected', {
      ip: req.ip,
      origin,
      allowedOrigins,
      path: req.path,
    });
    
    return res.status(403).json({
      error: 'CORS policy violation',
    });
  }
  
  next();
};

// API key validation middleware
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.get('X-API-Key');
  const validApiKeys = process.env.API_KEYS?.split(',') || [];
  
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    logger.warn('Invalid API key', {
      ip: req.ip,
      apiKey: apiKey ? 'provided' : 'missing',
      path: req.path,
    });
    
    return res.status(401).json({
      error: 'Invalid or missing API key',
    });
  }
  
  next();
};

// Honeypot middleware to catch bots
export const honeypot = (req: Request, res: Response, next: NextFunction) => {
  // Check for honeypot field in forms
  if (req.body && req.body.honeypot) {
    logger.warn('Honeypot triggered - likely bot', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });
    
    // Return success to not alert the bot
    return res.status(200).json({ success: true });
  }
  
  next();
};
