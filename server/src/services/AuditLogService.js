const prisma = require('../../prismaClient');

/**
 * Log a change to an entity in the audit log
 * @param {object} params
 * @param {object} params.user - The user who made the change
 * @param {string} params.action - The action performed (create/update/delete/sync)
 * @param {string} params.entity - The entity type (Customer/Party/etc)
 * @param {number} params.entityId - The ID of the entity
 * @param {object} params.details - Additional details about the change
 */
async function logChange({ user, action, entity, entityId, details }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: user?.id,
        action,
        entity,
        entityId,
        details: JSON.stringify(details)
      }
    });
  } catch (err) {
    console.error('Error logging change:', err);
    // Don't throw - we don't want audit logging to break the main flow
  }
}

/**
 * Get audit log entries for an entity
 * @param {string} entity - The entity type
 * @param {number} entityId - The entity ID
 * @param {object} options - Query options (limit, offset)
 */
async function getEntityAuditLog(entity, entityId, { limit = 10, offset = 0 } = {}) {
  try {
    return await prisma.auditLog.findMany({
      where: { entity, entityId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  } catch (err) {
    console.error('Error getting audit log:', err);
    return [];
  }
}

module.exports = {
  logChange,
  getEntityAuditLog
}; 