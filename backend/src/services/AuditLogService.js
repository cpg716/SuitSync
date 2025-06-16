const prisma = require('../../prisma');

async function logChange({ user, action, entity, entityId, details }) {
  await prisma.auditLog.create({
    data: {
      userId: user?.id || null,
      action,
      entity,
      entityId,
      details: typeof details === 'string' ? details : JSON.stringify(details),
    },
  });
}

module.exports = { logChange }; 