import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

export interface PinValidationResult {
  success: boolean;
  user?: any;
  error?: string;
  attemptsRemaining?: number;
  lockedUntil?: Date;
}

export class PinService {
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
  private static readonly PIN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_PIN_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Set a PIN for a user
   */
  static async setPin(userId: number, pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate PIN format (4 digits)
      if (!/^\d{4}$/.test(pin)) {
        return { success: false, error: 'PIN must be exactly 4 digits' };
      }

      // Hash the PIN
      const pinHash = await bcrypt.hash(pin, 10);

      // Update user with new PIN
      await prisma.user.update({
        where: { id: userId },
        data: {
          pinHash,
          pinSetAt: new Date(),
          pinAttempts: 0,
          pinLockedUntil: null,
          lastPinUse: null
        }
      });

      logger.info(`[PinService] PIN set for user ${userId}`);
      return { success: true };

    } catch (error: any) {
      logger.error(`[PinService] Error setting PIN for user ${userId}:`, error);
      return { success: false, error: 'Failed to set PIN' };
    }
  }

  /**
   * Validate a PIN for user switching
   */
  static async validatePin(userId: number, pin: string): Promise<PinValidationResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Check if user has a PIN set
      if (!user.pinHash) {
        return { success: false, error: 'No PIN set for this user' };
      }

      // Check if PIN is expired (older than 7 days)
      if (user.pinSetAt && Date.now() - user.pinSetAt.getTime() > this.MAX_PIN_AGE) {
        return { success: false, error: 'PIN has expired. Please set a new PIN.' };
      }

      // Check if user is locked out
      if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
        const remainingLockout = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 1000 / 60);
        return { 
          success: false, 
          error: `Account locked due to too many failed attempts. Try again in ${remainingLockout} minutes.`,
          lockedUntil: user.pinLockedUntil
        };
      }

      // Validate PIN format
      if (!/^\d{4}$/.test(pin)) {
        return { success: false, error: 'Invalid PIN format' };
      }

      // Check PIN
      const isValidPin = await bcrypt.compare(pin, user.pinHash);

      if (isValidPin) {
        // Reset attempts and update last use
        await prisma.user.update({
          where: { id: userId },
          data: {
            pinAttempts: 0,
            pinLockedUntil: null,
            lastPinUse: new Date()
          }
        });

        logger.info(`[PinService] Successful PIN validation for user ${userId}`);
        return { success: true, user };

      } else {
        // Increment failed attempts
        const newAttempts = (user.pinAttempts || 0) + 1;
        const updateData: any = {
          pinAttempts: newAttempts
        };

        // Lock account if max attempts reached
        if (newAttempts >= this.MAX_ATTEMPTS) {
          updateData.pinLockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
        }

        await prisma.user.update({
          where: { id: userId },
          data: updateData
        });

        const attemptsRemaining = Math.max(0, this.MAX_ATTEMPTS - newAttempts);
        
        if (newAttempts >= this.MAX_ATTEMPTS) {
          logger.warn(`[PinService] User ${userId} locked out after ${newAttempts} failed PIN attempts`);
          return { 
            success: false, 
            error: 'Too many failed attempts. Account locked for 5 minutes.',
            lockedUntil: updateData.pinLockedUntil
          };
        } else {
          logger.warn(`[PinService] Failed PIN attempt ${newAttempts} for user ${userId}`);
          return { 
            success: false, 
            error: `Invalid PIN. ${attemptsRemaining} attempts remaining.`,
            attemptsRemaining
          };
        }
      }

    } catch (error: any) {
      logger.error(`[PinService] Error validating PIN for user ${userId}:`, error);
      return { success: false, error: 'PIN validation failed' };
    }
  }

  /**
   * Remove PIN for a user
   */
  static async removePin(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          pinHash: null,
          pinSetAt: null,
          pinAttempts: 0,
          pinLockedUntil: null,
          lastPinUse: null
        }
      });

      logger.info(`[PinService] PIN removed for user ${userId}`);
      return { success: true };

    } catch (error: any) {
      logger.error(`[PinService] Error removing PIN for user ${userId}:`, error);
      return { success: false, error: 'Failed to remove PIN' };
    }
  }

  /**
   * Check if user has a valid PIN set
   */
  static async hasPinSet(userId: number): Promise<{ hasPin: boolean; isExpired?: boolean; isLocked?: boolean }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          pinHash: true,
          pinSetAt: true,
          pinLockedUntil: true
        }
      });

      if (!user || !user.pinHash) {
        return { hasPin: false };
      }

      const isExpired = user.pinSetAt && Date.now() - user.pinSetAt.getTime() > this.MAX_PIN_AGE;
      const isLocked = user.pinLockedUntil && user.pinLockedUntil > new Date();

      return {
        hasPin: true,
        isExpired: !!isExpired,
        isLocked: !!isLocked
      };

    } catch (error: any) {
      logger.error(`[PinService] Error checking PIN status for user ${userId}:`, error);
      return { hasPin: false };
    }
  }

  /**
   * Generate a random 4-digit PIN (for admin use)
   */
  static generateRandomPin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Get PIN security info for a user
   */
  static async getPinInfo(userId: number): Promise<{
    hasPin: boolean;
    setAt?: Date;
    lastUsed?: Date;
    attempts?: number;
    lockedUntil?: Date;
    isExpired?: boolean;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          pinHash: true,
          pinSetAt: true,
          lastPinUse: true,
          pinAttempts: true,
          pinLockedUntil: true
        }
      });

      if (!user) {
        return { hasPin: false };
      }

      const isExpired = user.pinSetAt && Date.now() - user.pinSetAt.getTime() > this.MAX_PIN_AGE;

      return {
        hasPin: !!user.pinHash,
        setAt: user.pinSetAt || undefined,
        lastUsed: user.lastPinUse || undefined,
        attempts: user.pinAttempts || 0,
        lockedUntil: user.pinLockedUntil || undefined,
        isExpired: !!isExpired
      };

    } catch (error: any) {
      logger.error(`[PinService] Error getting PIN info for user ${userId}:`, error);
      return { hasPin: false };
    }
  }
}
