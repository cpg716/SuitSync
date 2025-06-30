import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import metricsService from '../services/metricsService';

interface RequestWithContext extends Request {
  requestId: string;
  startTime: number;
  logger: ReturnType<typeof logger.withContext>;
}

// Request ID middleware
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  (req as RequestWithContext).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Request context logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const extendedReq = req as RequestWithContext;
  const startTime = Date.now();
  extendedReq.startTime = startTime;

  // Create contextual logger
  extendedReq.logger = logger.withContext({
    requestId: extendedReq.requestId,
    userId: (req as any).user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Log request start
  extendedReq.logger.info('Request started', {
    method: req.method,
    url: req.originalUrl || req.url,
    query: req.query,
    body: sanitizeRequestBody(req.body),
  });

  // Capture response
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody: any;

  res.send = function(data: any) {
    responseBody = data;
    return originalSend.call(this, data);
  };

  res.json = function(data: any) {
    responseBody = data;
    return originalJson.call(this, data);
  };

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;

    // Record metrics
    metricsService.recordRequest(duration, isError);

    // Log response
    const logLevel = isError ? 'warn' : 'info';
    extendedReq.logger[logLevel]('Request completed', {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length'),
      responseBody: sanitizeResponseBody(responseBody, res.statusCode),
    });

    // Log to access log
    logger.access(req, res, duration);
  });

  next();
};

// Error logging middleware
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  const extendedReq = req as RequestWithContext;
  const duration = Date.now() - (extendedReq.startTime || Date.now());

  // Record error metrics
  metricsService.recordRequest(duration, true);

  // Log error with full context
  const errorLogger = extendedReq.logger || logger.withContext({
    requestId: extendedReq.requestId,
    userId: (req as any).user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  errorLogger.error('Request error', {
    method: req.method,
    url: req.originalUrl || req.url,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode || 500,
    },
    duration,
    body: sanitizeRequestBody(req.body),
    query: req.query,
    params: req.params,
  });

  next(err);
};

// Performance monitoring middleware
export const performanceMonitor = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (duration > threshold) {
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.originalUrl || req.url,
          duration,
          threshold,
          statusCode: res.statusCode,
          userId: (req as any).user?.id,
          ip: req.ip,
        });
      }
    });

    next();
  };
};

// Database query logging middleware
export const queryLogger = (req: Request, res: Response, next: NextFunction) => {
  const extendedReq = req as RequestWithContext;
  
  // This would integrate with Prisma's logging
  // For now, we'll add it to the request context for manual logging
  (req as any).logQuery = (query: string, duration: number, params?: any) => {
    extendedReq.logger.debug('Database query', {
      query,
      duration,
      params: params ? sanitizeQueryParams(params) : undefined,
    });
  };

  next();
};

// Security event logging
export const securityLogger = (event: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const extendedReq = req as RequestWithContext;
    
    const securityEvent = {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      url: req.originalUrl || req.url,
      method: req.method,
      headers: sanitizeHeaders(req.headers),
    };

    extendedReq.logger.warn('Security event', securityEvent);

    // For high/critical events, also log to separate security log
    if (severity === 'high' || severity === 'critical') {
      logger.error('Critical security event', securityEvent);
    }

    next();
  };
};

// Utility functions for sanitizing sensitive data
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'creditCard',
    'ssn',
    'socialSecurityNumber',
  ];

  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

function sanitizeResponseBody(body: any, statusCode: number): any {
  // Don't log response body for successful requests to reduce log size
  if (statusCode < 400) {
    return undefined;
  }

  // For error responses, log the body but sanitize sensitive data
  if (body && typeof body === 'object') {
    return sanitizeRequestBody(body);
  }

  return body;
}

function sanitizeQueryParams(params: any): any {
  if (!params || typeof params !== 'object') {
    return params;
  }

  const sensitiveParams = ['token', 'apiKey', 'secret', 'password'];
  const sanitized = { ...params };
  
  for (const param of sensitiveParams) {
    if (sanitized[param]) {
      sanitized[param] = '[REDACTED]';
    }
  }

  return sanitized;
}

function sanitizeHeaders(headers: any): any {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ];

  const sanitized = { ...headers };
  
  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Export types for use in other files
export type { RequestWithContext };
