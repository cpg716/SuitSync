import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import logger from '../utils/logger';

// Common validation schemas
export const commonSchemas = {
  id: z.coerce.number().int().positive(),
  email: z.string().email().max(255),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/).max(20).optional(),
  name: z.string().min(1).max(255).trim(),
  notes: z.string().max(2000).optional(),
  date: z.string().datetime().or(z.date()),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
  search: z.string().max(255).optional(),
};

// Customer validation schemas
export const customerSchemas = {
  create: z.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    phone: commonSchemas.phone,
    address: z.string().max(500).optional(),
  }),
  update: z.object({
    name: commonSchemas.name.optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone,
    address: z.string().max(500).optional(),
  }),
  query: z.object({
    search: commonSchemas.search,
    ...commonSchemas.pagination.shape,
  }),
};

// Party validation schemas
export const partySchemas = {
  create: z.object({
    name: commonSchemas.name,
    eventDate: commonSchemas.date,
    customerId: commonSchemas.id,
    notes: commonSchemas.notes,
  }),
  update: z.object({
    name: commonSchemas.name.optional(),
    eventDate: commonSchemas.date.optional(),
    notes: commonSchemas.notes,
  }),
};

// Alteration job validation schemas
export const alterationJobSchemas = {
  create: z.object({
    customerId: commonSchemas.id.optional(),
    partyId: commonSchemas.id.optional(),
    partyMemberId: commonSchemas.id.optional(),
    notes: commonSchemas.notes,
    dueDate: commonSchemas.date.optional(),
    rushOrder: z.boolean().default(false),
    jobParts: z.array(z.object({
      partName: z.string().min(1).max(100),
      partType: z.enum(['JACKET', 'PANTS', 'VEST', 'SHIRT', 'DRESS', 'SKIRT', 'OTHER']),
      priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'RUSH']).default('NORMAL'),
      estimatedTime: z.number().int().min(1).max(480).optional(), // max 8 hours
      notes: commonSchemas.notes,
    })).min(1),
  }).refine(data => data.customerId || data.partyId, {
    message: "Either customerId or partyId must be provided",
  }),
  update: z.object({
    notes: commonSchemas.notes,
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'ON_HOLD', 'CANCELLED']).optional(),
    dueDate: commonSchemas.date.optional(),
    rushOrder: z.boolean().optional(),
    tailorId: commonSchemas.id.optional(),
  }),
  query: z.object({
    status: z.array(z.string()).optional(),
    tailorId: commonSchemas.id.optional(),
    customerId: commonSchemas.id.optional(),
    partyId: commonSchemas.id.optional(),
    ...commonSchemas.pagination.shape,
  }),
};

// Appointment validation schemas
export const appointmentSchemas = {
  create: z.object({
    partyId: commonSchemas.id,
    dateTime: commonSchemas.date,
    durationMinutes: z.number().int().min(15).max(480).default(60),
    type: z.enum(['fitting', 'pickup', 'final_try', 'other']).default('fitting'),
    notes: commonSchemas.notes,
    tailorId: commonSchemas.id.optional(),
  }),
  update: z.object({
    dateTime: commonSchemas.date.optional(),
    durationMinutes: z.number().int().min(15).max(480).optional(),
    type: z.enum(['fitting', 'pickup', 'final_try', 'other']).optional(),
    notes: commonSchemas.notes,
    status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
    tailorId: commonSchemas.id.optional(),
  }),
  query: z.object({
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional(),
    tailorId: commonSchemas.id.optional(),
    partyId: commonSchemas.id.optional(),
    status: z.array(z.string()).optional(),
    ...commonSchemas.pagination.shape,
  }),
};

// User validation schemas
export const userSchemas = {
  create: z.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    role: z.enum(['admin', 'sales_management', 'sales_support', 'tailor', 'sales']),
    commissionRate: z.number().min(0).max(1).optional(),
    lightspeedEmployeeId: z.string().max(50).optional(),
  }),
  update: z.object({
    name: commonSchemas.name.optional(),
    email: commonSchemas.email.optional(),
    role: z.enum(['admin', 'sales_management', 'sales_support', 'tailor', 'sales']).optional(),
    commissionRate: z.number().min(0).max(1).optional(),
    lightspeedEmployeeId: z.string().max(50).optional(),
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  }),
};

// Auth validation schemas
export const authSchemas = {
  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1).max(128),
  }),
  register: z.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    password: z.string().min(8).max(128)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  }),
};

// Validation middleware factory
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        logger.warn('Validation error:', { errors, body: req.body });
        
        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      } else {
        logger.error('Unexpected validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        logger.warn('Query validation error:', { errors, query: req.query });
        
        res.status(400).json({
          error: 'Invalid query parameters',
          details: errors,
        });
      } else {
        logger.error('Unexpected query validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        logger.warn('Params validation error:', { errors, params: req.params });
        
        res.status(400).json({
          error: 'Invalid parameters',
          details: errors,
        });
      } else {
        logger.error('Unexpected params validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

// Sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Remove null bytes and control characters
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  
  next();
}
