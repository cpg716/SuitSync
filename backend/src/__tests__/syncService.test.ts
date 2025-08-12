import { createLightspeedError, withLightspeedErrorHandling } from '../middleware/lightspeedErrorHandler';

// Simple unit tests for the error handling functions
describe('Lightspeed Error Handling', () => {
  describe('createLightspeedError', () => {
    it('should create properly formatted Lightspeed errors', () => {
      const error = createLightspeedError('TEST_ERROR', 'Test message', 400, { test: 'data' }, '/test');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('LIGHTSPEED_TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ test: 'data' });
      expect(error.endpoint).toBe('/test');
    });

    it('should use default status code when not provided', () => {
      const error = createLightspeedError('TEST_ERROR', 'Test message');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('LIGHTSPEED_TEST_ERROR');
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

    it('should pass through existing Lightspeed errors', async () => {
      const lightspeedError = createLightspeedError('EXISTING_ERROR', 'Already formatted', 400);
      const operation = jest.fn().mockRejectedValue(lightspeedError);

      await expect(withLightspeedErrorHandling(operation))
        .rejects.toBe(lightspeedError);
    });
  });
});
