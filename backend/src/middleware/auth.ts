import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { MultiUserSessionService } from '../services/multiUserSessionService';

const prisma = new PrismaClient().$extends(withAccelerate());
const DEMO = process.env.DEMO === 'true';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // HYBRID AUTHENTICATION: Lightspeed users with optional local augmentation

    // Defensive: check for session existence
    if (!req.session) {
      console.error('No session found on request');
      return res.status(401).json({
        error: 'Session missing. Please log in again.',
        errorCode: 'SESSION_MISSING',
        redirectTo: '/login'
      });
    }

    // Special bypass only for internal/manual sync endpoints that use persistent tokens
    // No automatic bypass for sync endpoints; all sync routes require authentication

    // Check for Lightspeed user authentication with optional local user data
    if (req.session.lightspeedUser) {
      const lightspeedUser = req.session.lightspeedUser;
      let localUser = null;

      // If we have a local user ID, fetch the full local user data
      if (lightspeedUser.hasLocalRecord && lightspeedUser.localUserId) {
        try {
          localUser = await prisma.user.findUnique({
            where: { id: lightspeedUser.localUserId },
            include: {
              tailorAbilities: {
                include: {
                  taskType: true
                }
              },
              tailorSchedules: true,
              skills: true
            }
          });
        } catch (error) {
          console.error('Error fetching local user data:', error);
          // Continue without local user data
        }
      }

      // Create hybrid user object combining Lightspeed identity and optional local augmentations
      (req as any).user = {
        // Core identity from Lightspeed
        id: lightspeedUser.id,
        lightspeedId: lightspeedUser.lightspeedId || lightspeedUser.lightspeedEmployeeId,
        email: lightspeedUser.email,
        name: lightspeedUser.name,
        role: lightspeedUser.role,
        lightspeedEmployeeId: lightspeedUser.lightspeedEmployeeId,
        photoUrl: lightspeedUser.photoUrl || (lightspeedUser as any).image_source || (lightspeedUser as any).photo_url || (lightspeedUser as any).avatar || undefined,
        isLightspeedUser: true,

        // Enhanced data from local database (if available)
        hasLocalRecord: !!localUser,
        localUserId: localUser?.id,
        commissionRate: localUser?.commissionRate || 0.1,
        tailorAbilities: localUser?.tailorAbilities || [],
        tailorSchedules: localUser?.tailorSchedules || [],
        skills: localUser?.skills || [],
        notificationPrefs: localUser?.notificationPrefs || null,
        createdAt: localUser?.createdAt,
        updatedAt: localUser?.updatedAt
      };

      // Check if Lightspeed connection is required and available
      // Only require Lightspeed tokens for Lightspeed proxy endpoints, not internal DB-backed routes
      const requiresLightspeed = ['/api/lightspeed', '/api/lightspeed-sync'].some(p => req.originalUrl.startsWith(p));
      if (requiresLightspeed && !req.session.lsAccessToken) {
        console.error('Lightspeed token missing or expired for user', lightspeedUser.id);
        return res.status(401).json({
          error: 'Session expired or Lightspeed connection required. Please log in again.',
          errorCode: 'LS_AUTH_EXPIRED',
          redirectTo: '/auth/start-lightspeed'
        });
      }

      return next();
    }

    // Remove legacy pure-local auth: all users are Lightspeed identities with optional local augmentation

    // Check for multi-user session (legacy support for user switching)
    if (req.session.userSessions && req.session.activeUserId) {
      try {
        const activeUserId = typeof req.session.activeUserId === 'string' ? parseInt(req.session.activeUserId, 10) : req.session.activeUserId;
        const userSession = req.session.userSessions[activeUserId];

        if (userSession) {
          // Try to load the local user
          const localUser = await prisma.user.findUnique({
            where: { id: activeUserId },
            include: {
              tailorAbilities: {
                include: {
                  taskType: true
                }
              },
              tailorSchedules: true,
              skills: true
            }
          });

          if (localUser) {
            // Create user object from multi-user session
            (req as any).user = {
              id: localUser.id,
              lightspeedId: localUser.lightspeedEmployeeId,
              email: localUser.email,
              name: localUser.name,
              role: localUser.role,
              lightspeedEmployeeId: localUser.lightspeedEmployeeId,
              photoUrl: localUser.photoUrl,
              isLightspeedUser: true,
              hasLocalRecord: true,
              localUserId: localUser.id,
              commissionRate: localUser.commissionRate || 0.1,
              tailorAbilities: localUser.tailorAbilities || [],
              tailorSchedules: localUser.tailorSchedules || [],
              skills: localUser.skills || [],
              notificationPrefs: localUser.notificationPrefs || null,
              createdAt: localUser.createdAt,
              updatedAt: localUser.updatedAt
            };

            // Update session tokens for Lightspeed API calls
            req.session.lsAccessToken = userSession.lsAccessToken;
            req.session.lsRefreshToken = userSession.lsRefreshToken;
            req.session.lsDomainPrefix = userSession.lsDomainPrefix;

            return next();
          }
        }
      } catch (error) {
        console.error('Error handling multi-user session:', error, { sessionId: req.sessionID });
        // Continue to require fresh authentication
      }
    }

    // Check for selected user (PC version user selection)
    if (req.session.selectedUser) {
      // Create user object from selected user
      (req as any).user = {
        id: req.session.selectedUser.id,
        lightspeedId: req.session.selectedUser.id,
        email: req.session.selectedUser.email,
        name: req.session.selectedUser.name,
        role: req.session.selectedUser.role,
        lightspeedEmployeeId: req.session.selectedUser.id,
        photoUrl: req.session.selectedUser.photoUrl,
        isLightspeedUser: true,
        hasLocalRecord: false,
        localUserId: null,
        commissionRate: 0.1,
        tailorAbilities: [],
        tailorSchedules: [],
        skills: [],
        notificationPrefs: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // For selected users, we use persistent tokens from the database
      // The sync service will handle token management
      return next();
    }

    // As a hardening step for app endpoints (non-Lightspeed proxy routes):
    // If we have valid Lightspeed tokens in the session, treat the request as authenticated,
    // even if lightspeedUser object was not fully hydrated (e.g., cross-tab race).
    if (req.session.lsAccessToken && req.session.lsDomainPrefix) {
      (req as any).user = {
        id: req.session.selectedUser?.id || 'ls-session',
        lightspeedId: req.session.selectedUser?.id,
        email: req.session.selectedUser?.email,
        name: req.session.selectedUser?.name || 'Lightspeed Session',
        role: req.session.selectedUser?.role || 'admin',
        lightspeedEmployeeId: req.session.selectedUser?.id,
        photoUrl: req.session.selectedUser?.photoUrl,
        isLightspeedUser: true,
        hasLocalRecord: false,
        localUserId: null,
        commissionRate: 0.1,
        tailorAbilities: [],
        tailorSchedules: [],
        skills: [],
        notificationPrefs: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return next();
    }

    // No valid authentication found
    console.error('Authentication required. No valid session found.', { sessionId: req.sessionID, ip: req.ip });
    return res.status(401).json({
      error: 'Authentication required. Please sign in with Lightspeed.',
      errorCode: 'AUTH_REQUIRED',
      redirectTo: '/login'
    });

  } catch (err) {
    console.error('Auth error:', err, { sessionId: req.sessionID, ip: req.ip });
    return res.status(401).json({ error: 'Invalid authentication' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).user && (req as any).user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Requires admin privileges' });
}

/**
 * Attach user to request if available in session (non-blocking)
 * Does NOT enforce authentication; downstream routes can behave read-only.
 */
export async function attachUserIfAvailable(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.session) return next();
    if (req.session.lightspeedUser) {
      (req as any).user = {
        id: req.session.lightspeedUser.id,
        lightspeedId: req.session.lightspeedUser.lightspeedId || req.session.lightspeedUser.lightspeedEmployeeId,
        email: req.session.lightspeedUser.email,
        name: req.session.lightspeedUser.name,
        role: req.session.lightspeedUser.role || 'admin',
        lightspeedEmployeeId: req.session.lightspeedUser.lightspeedEmployeeId,
        isLightspeedUser: true,
      };
      return next();
    }
    if (req.session.selectedUser || (req.session.lsAccessToken && req.session.lsDomainPrefix)) {
      (req as any).user = {
        id: req.session.selectedUser?.id || 'ls-session',
        lightspeedId: req.session.selectedUser?.id,
        email: req.session.selectedUser?.email,
        name: req.session.selectedUser?.name || 'Lightspeed Session',
        role: req.session.selectedUser?.role || 'admin',
        lightspeedEmployeeId: req.session.selectedUser?.id,
        isLightspeedUser: true,
      };
    }
  } catch {}
  return next();
}

/**
 * Role-based permission system for SuitSync
 *
 * Role Permissions:
 * - Sales: appointments, sales, parties, customers
 * - Tailor: alterations only
 * - Sales Support: can assign appointments, alterations, parties
 * - Sales Management: appointments, sales, parties, customers
 * - Admin: not assigned to tasks/jobs/appointments - oversight only
 */
export const ROLE_PERMISSIONS = {
  'sales': {
    appointments: { read: true, write: true, assign: false },
    sales: { read: true, write: true, assign: false },
    parties: { read: true, write: true, assign: false },
    customers: { read: true, write: true, assign: false },
    alterations: { read: true, write: false, assign: false },
    admin: { read: false, write: false, assign: false }
  },
  'tailor': {
    appointments: { read: false, write: false, assign: false },
    sales: { read: false, write: false, assign: false },
    parties: { read: false, write: false, assign: false },
    customers: { read: false, write: false, assign: false },
    alterations: { read: true, write: true, assign: false },
    admin: { read: false, write: false, assign: false }
  },
  'sales_support': {
    appointments: { read: true, write: false, assign: true },
    sales: { read: true, write: false, assign: false },
    parties: { read: true, write: false, assign: true },
    customers: { read: true, write: false, assign: false },
    alterations: { read: true, write: false, assign: true },
    admin: { read: false, write: false, assign: false }
  },
  'sales_management': {
    appointments: { read: true, write: true, assign: true },
    sales: { read: true, write: true, assign: false },
    parties: { read: true, write: true, assign: true },
    customers: { read: true, write: true, assign: false },
    alterations: { read: true, write: false, assign: true },
    admin: { read: false, write: false, assign: false }
  },
  'admin': {
    appointments: { read: true, write: true, assign: true },
    sales: { read: true, write: true, assign: true },
    parties: { read: true, write: true, assign: true },
    customers: { read: true, write: true, assign: true },
    alterations: { read: true, write: true, assign: true },
    admin: { read: true, write: true, assign: true }
  }
};

/**
 * Check if user has permission for a specific resource and action
 */
export function hasPermission(userRole: string, resource: string, action: 'read' | 'write' | 'assign'): boolean {
  // Superuser bypass
  if (userRole === 'admin') return true;
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
  if (!permissions) return false;

  const resourcePerms = permissions[resource as keyof typeof permissions];
  if (!resourcePerms) return false;

  return resourcePerms[action] === true;
}

/**
 * Middleware to require specific permission for a resource
 */
export function requirePermission(resource: string, action: 'read' | 'write' | 'assign') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (hasPermission(user.role, resource, action)) {
      return next();
    }

    return res.status(403).json({
      error: `Forbidden: ${user.role} role does not have ${action} permission for ${resource}`,
      requiredPermission: { resource, action },
      userRole: user.role
    });
  };
}