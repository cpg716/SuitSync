import { Request, Response, NextFunction } from 'express';
import { lightspeedErrorHandler, createLightspeedError, withLightspeedErrorHandling } from '../middleware/lightspeedErrorHandler';

describe('Lightspeed Error Handler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      url: '/api/test',
      method: 'GET'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('lightspeedErrorHandler', () => {
    it('should handle LIGHTSPEED_AUTH_FAILED errors', () => {
      const error = createLightspeedError('AUTH_FAILED', 'Authentication failed', 401);
      
      lightspeedErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Please re-authenticate with Lightspeed',
        code: 'AUTH_REQUIRED',
        redirectTo: '/auth/start-lightspeed'
      });
    });

    it('should handle LIGHTSPEED_RATE_LIMITED errors', () => {
      const error = createLightspeedError('RATE_LIMITED', 'Rate limit exceeded', 429);
      error.retryAfter = 60;
      
      lightspeedErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Rate limit exceeded',
        message: 'Too many requests to Lightspeed API. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfter: 60
      });
    });

    it('should handle LIGHTSPEED_VALIDATION_ERROR errors', () => {
      const error = createLightspeedError('VALIDATION_ERROR', 'Validation error', 422, { field: 'email' });
      
      lightspeedErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation error',
        message: 'The data sent to Lightspeed was invalid',
        code: 'VALIDATION_ERROR',
        details: { field: 'email' }
      });
    });

    it('should pass non-Lightspeed errors to next handler', () => {
      const error = new Error('Generic error');
      
      lightspeedErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('createLightspeedError', () => {
    it('should create properly formatted Lightspeed errors', () => {
      const error = createLightspeedError('TEST_ERROR', 'Test message', 400, { test: 'data' }, '/test');
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('LIGHTSPEED_TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ test: 'data' });
      expect(error.endpoint).toBe('/test');
    });
  });

  describe('withLightspeedErrorHandling', () => {
    it('should handle successful operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await withLightspeedErrorHandling(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should convert 401 errors to Lightspeed auth errors', async () => {
      const axiosError = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' }
        }
      };
      const operation = jest.fn().mockRejectedValue(axiosError);
      
      await expect(withLightspeedErrorHandling(operation, { endpoint: '/customers' }))
        .rejects.toMatchObject({
          code: 'LIGHTSPEED_AUTH_FAILED',
          statusCode: 401,
          endpoint: '/customers'
        });
    });

    it('should convert 429 errors to rate limit errors', async () => {
      const axiosError = {
        response: {
          status: 429,
          data: { error: 'Rate limited' },
          headers: { 'retry-after': '120' }
        }
      };
      const operation = jest.fn().mockRejectedValue(axiosError);
      
      await expect(withLightspeedErrorHandling(operation))
        .rejects.toMatchObject({
          code: 'LIGHTSPEED_RATE_LIMITED',
          statusCode: 429,
          retryAfter: '120'
        });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      const operation = jest.fn().mockRejectedValue(networkError);
      
      await expect(withLightspeedErrorHandling(operation))
        .rejects.toMatchObject({
          code: 'LIGHTSPEED_NETWORK_ERROR',
          statusCode: 500
        });
    });
  });
});
