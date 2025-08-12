import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Middleware to handle Lightspeed API errors and convert them to appropriate HTTP responses
 */
export const lightspeedErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  // If it's not a Lightspeed error, pass to next error handler
  if (!error.code || !error.code.startsWith('LIGHTSPEED_')) {
    return next(error);
  }

  logger.error('Lightspeed API Error:', {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    endpoint: error.endpoint,
    details: error.details,
    url: req.url,
    method: req.method
  });

  // Map Lightspeed errors to appropriate responses
  switch (error.code) {
    case 'LIGHTSPEED_AUTH_FAILED':
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Please re-authenticate with Lightspeed',
        code: 'AUTH_REQUIRED',
        redirectTo: '/auth/start-lightspeed'
      });

    case 'LIGHTSPEED_PERMISSION_DENIED':
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Insufficient permissions for this Lightspeed resource',
        code: 'PERMISSION_DENIED',
        details: error.details
      });

    case 'LIGHTSPEED_RESOURCE_NOT_FOUND':
      return res.status(404).json({
        error: 'Resource not found',
        message: `The requested Lightspeed resource was not found`,
        code: 'RESOURCE_NOT_FOUND',
        endpoint: error.endpoint
      });

    case 'LIGHTSPEED_RATE_LIMITED':
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests to Lightspeed API. Please try again later.`,
        code: 'RATE_LIMITED',
        retryAfter: error.retryAfter
      });

    case 'LIGHTSPEED_VALIDATION_ERROR':
      return res.status(422).json({
        error: 'Validation error',
        message: 'The data sent to Lightspeed was invalid',
        code: 'VALIDATION_ERROR',
        details: error.details
      });

    case 'LIGHTSPEED_SERVICE_ERROR':
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Lightspeed service is temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
        details: error.details
      });

    case 'LIGHTSPEED_API_ERROR':
    default:
      return res.status(error.statusCode || 500).json({
        error: 'Lightspeed API error',
        message: error.message || 'An error occurred while communicating with Lightspeed',
        code: 'API_ERROR',
        details: error.details
      });
  }
};

/**
 * Helper function to create standardized Lightspeed errors
 */
export const createLightspeedError = (
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any,
  endpoint?: string
) => {
  const error: any = new Error(message);
  error.code = `LIGHTSPEED_${code}`;
  error.statusCode = statusCode;
  error.details = details;
  error.endpoint = endpoint;
  return error;
};

/**
 * Wrapper for Lightspeed API calls that standardizes error handling
 */
export const withLightspeedErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: { endpoint?: string; method?: string } = {}
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    // If it's already a Lightspeed error, re-throw
    if (error.code && error.code.startsWith('LIGHTSPEED_')) {
      throw error;
    }

    // Convert Axios errors to Lightspeed errors
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      switch (statusCode) {
        case 401:
          throw createLightspeedError('AUTH_FAILED', 'Authentication failed', 401, errorData, context.endpoint);
        case 403:
          throw createLightspeedError('PERMISSION_DENIED', 'Insufficient permissions', 403, errorData, context.endpoint);
        case 404:
          throw createLightspeedError('RESOURCE_NOT_FOUND', 'Resource not found', 404, errorData, context.endpoint);
        case 429:
          const retryAfter = error.response.headers['retry-after'] || 60;
          const rateLimitError = createLightspeedError('RATE_LIMITED', 'Rate limit exceeded', 429, errorData, context.endpoint);
          rateLimitError.retryAfter = retryAfter;
          throw rateLimitError;
        case 422:
          throw createLightspeedError('VALIDATION_ERROR', 'Validation error', 422, errorData, context.endpoint);
        case 500:
        case 502:
        case 503:
        case 504:
          throw createLightspeedError('SERVICE_ERROR', 'Service temporarily unavailable', statusCode, errorData, context.endpoint);
        default:
          throw createLightspeedError('API_ERROR', error.message || 'Unknown API error', statusCode, errorData, context.endpoint);
      }
    }

    // For non-HTTP errors (network, timeout, etc.)
    throw createLightspeedError('NETWORK_ERROR', error.message || 'Network error occurred', 500, error, context.endpoint);
  }
};
