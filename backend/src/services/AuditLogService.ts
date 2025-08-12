import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

export const AuditLogService = {
  logAction: async (userId: number | null, action: string, entity: string, entityId: number, details: any) => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: userId ?? null,
          action,
          entity,
          entityId,
          details: typeof details === 'string' ? details : JSON.stringify(details),
        },
      });
    } catch (err) {
      console.warn('[AuditLogService] Failed to write audit log', err);
    }
  }
};

export default AuditLogService;

// Backward compatibility for existing imports
// Flexible signature to support legacy/object calls and optional extra context
export const logChange = async (
  ...args: any[]
) => {
  try {
    if (args.length === 1 && typeof args[0] === 'object') {
      const obj = args[0] || {};
      const userId = obj.user?.id ?? obj.userId ?? null;
      const { action, entity, entityId, details } = obj;
      await AuditLogService.logAction(userId, String(action), String(entity), Number(entityId), details ?? {});
      return;
    }
    // Positional: (userId, action, entity, entityId, details, [context])
    const [userId, action, entity, entityId, details] = args;
    await AuditLogService.logAction(userId ?? null, String(action), String(entity), Number(entityId), details ?? {});
  } catch (err) {
    console.warn('[AuditLogService] logChange failed', err);
  }
};