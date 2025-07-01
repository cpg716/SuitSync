# Critical Fixes Required for SuitSync

## 1. Fix Configuration Validation

```typescript
// backend/src/utils/config.ts - Add missing environment variables
const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().default(3000),
  
  // Lightspeed required variables
  LS_CLIENT_ID: z.string().min(1, 'LS_CLIENT_ID is required'),
  LS_CLIENT_SECRET: z.string().min(1, 'LS_CLIENT_SECRET is required'),
  LS_REDIRECT_URI: z.string().url('LS_REDIRECT_URI must be a valid URL'),
  LS_DOMAIN: z.string().min(1, 'LS_DOMAIN is required'),
  
  // Optional variables with defaults
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM: z.string().email().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
```

## 2. Fix Frontend API Client Redirect Loop

```typescript
// frontend/lib/apiClient.ts - Prevent infinite redirects
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Prevent redirect loops
      if (typeof window !== 'undefined' && 
          !window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/auth/')) {
        localStorage.removeItem('token');
        // Use replace to prevent back button issues
        window.location.replace('/login?sessionExpired=true');
      }
      return Promise.reject(error);
    }
    // ... rest of error handling
  }
);
```

## 3. Add Circuit Breaker for Lightspeed API

```typescript
// backend/src/services/circuitBreaker.ts
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,
    private timeout = 60000,
    private monitoringPeriod = 10000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

## 4. Fix Session Size Management

```typescript
// backend/src/middleware/sessionManager.ts
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
          activeUserId: req.session.activeUserId,
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
```

## 5. Add Proper Error Handling for Database Operations

```typescript
// backend/src/utils/dbErrorHandler.ts
export const handlePrismaError = (error: any) => {
  if (error.code === 'P2002') {
    return { status: 409, message: 'Unique constraint violation' };
  }
  if (error.code === 'P2025') {
    return { status: 404, message: 'Record not found' };
  }
  if (error.code === 'P2003') {
    return { status: 400, message: 'Foreign key constraint failed' };
  }
  
  logger.error('Database error:', error);
  return { status: 500, message: 'Database operation failed' };
};

// Usage in controllers:
try {
  const result = await prisma.customer.create({ data });
  res.json(result);
} catch (error) {
  const { status, message } = handlePrismaError(error);
  res.status(status).json({ error: message });
}
```

## 6. Fix Rate Limiting Configuration

```typescript
// backend/src/middleware/rateLimiting.ts
export const createSmartRateLimit = (config: {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    ...config,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = Math.ceil(config.windowMs / 1000);
      res.status(429).json({
        error: 'Too many requests',
        retryAfter,
        limit: config.max,
        windowMs: config.windowMs,
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health';
    },
  });
};
```