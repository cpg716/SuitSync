const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createLightspeedClient } = require('../lightspeedClient');
const logger = require('../utils/logger');

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'user-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Get all users (following Lightspeed API docs structure)
const getUsers = async (req, res) => {
  try {
    // Get local users
    const localUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lightspeedEmployeeId: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' }
    });

    // If we have Lightspeed integration, sync user data
    try {
      const lightspeedClient = createLightspeedClient(null);
      
      // Use API 2.0 /users endpoint according to docs
      const lightspeedUsersResponse = await lightspeedClient.get('/users');
      const lightspeedUsers = lightspeedUsersResponse.data.data || [];
      
      logger.info(`[Users] Found ${lightspeedUsers.length} users in Lightspeed`);
      
      // Log structure of first user for debugging
      if (lightspeedUsers.length > 0) {
        logger.info(`[Users] Lightspeed user structure:`, Object.keys(lightspeedUsers[0]));
      }
      
      res.json({
        localUsers,
        lightspeedUsers: lightspeedUsers.map(user => ({
          id: user.id,
          display_name: user.display_name,
          email: user.email,
          account_type: user.account_type,
          // Try different possible photo field names
          photo: user.image_source || user.image || user.avatar || user.photo || user.profile_image,
          active: user.active,
          last_login: user.last_login
        }))
      });
      
    } catch (lightspeedError) {
      logger.warn('[Users] Could not fetch users from Lightspeed:', lightspeedError.message);
      res.json({ localUsers, lightspeedUsers: [] });
    }
    
  } catch (error) {
    logger.error('[Users] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get current user (following API 2.0 /user endpoint)
const getCurrentUser = async (req, res) => {
  try {
    if (!req.session?.lsAccessToken) {
      return res.status(401).json({ error: 'Not authenticated with Lightspeed' });
    }
    
    const lightspeedClient = createLightspeedClient(req);
    
    // Use the "Get current user" endpoint according to API docs
    const currentUserResponse = await lightspeedClient.get('/user');
    const currentUser = currentUserResponse.data.data;
    
    logger.info('[Users] Current user from Lightspeed:', {
      id: currentUser.id,
      display_name: currentUser.display_name,
      email: currentUser.email,
      account_type: currentUser.account_type
    });
    
    res.json({
      lightspeed: currentUser,
      local: req.user
    });
    
  } catch (error) {
    logger.error('[Users] Error fetching current user from Lightspeed:', error);
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
};

const listUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const where = {};
    if (role) {
      where.role = role;
    }
    const users = await prisma.user.findMany({
      where,
      include: { saleAssignments: true, skills: true }
    });
    res.json(users);
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { saleAssignments: true, skills: true, auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 } }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error getting user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Security check
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 1. Fetch from local SuitSync AuditLog
    const localActivity = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 2. Fetch from Lightspeed Audit Log if user is linked
    let lightspeedActivity = [];
    if (user.lightspeedEmployeeId && req.session.lsAccessToken) {
      try {
        const lsLogs = await getLightspeedAuditLog(req.session);
        // Filter and map Lightspeed logs
        lightspeedActivity = lsLogs
          .filter(log => log.user_id === user.lightspeedEmployeeId) // Assuming user_id is in the log
          .map(log => ({
            id: `ls-${log.id}`,
            action: log.action,
            entity: log.object,
            details: log.details || `Performed ${log.action} on ${log.object}`,
            createdAt: log.created_at,
            source: 'Lightspeed',
          }));
      } catch (lsErr) {
        console.error(`Could not fetch Lightspeed audit log for user ${userId}:`, lsErr.message);
        // Don't fail the whole request, just log the error
      }
    }

    // 3. Merge and sort activities
    const combinedActivity = [...localActivity, ...lightspeedActivity]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50); // Take the most recent 50 from the combined list

    res.json(combinedActivity);
  } catch (err) {
    console.error(`Error fetching activity for user ${req.params.id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, password, name, role, lightspeedEmployeeId } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const passwordHash = require('bcryptjs').hashSync(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role, lightspeedEmployeeId },
    });
    // Audit log
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'create', entity: 'User', entityId: user.id, details: `Created user ${email}` }
    });
    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, role, lightspeedEmployeeId, photoUrl, email, notificationPrefs, password, currentPassword } = req.body;
    const data = {};
    if (name) data.name = name;
    if (role) data.role = role;
    if (lightspeedEmployeeId) data.lightspeedEmployeeId = lightspeedEmployeeId;
    if (photoUrl) data.photoUrl = photoUrl;
    if (email) data.email = email;
    if (notificationPrefs) data.notificationPrefs = notificationPrefs;
    // Password change
    if (password && currentPassword) {
      const user = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
      if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
        return res.status(400).json({ error: 'Current password incorrect' });
      }
      data.passwordHash = bcrypt.hashSync(password, 10);
    }
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    // Audit log
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'update', entity: 'User', entityId: user.id, details: `Updated user ${user.email}` }
    });
    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await prisma.user.delete({
      where: { id: parseInt(req.params.id) },
    });
    // Audit log
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'delete', entity: 'User', entityId: user.id, details: `Deleted user ${user.email}` }
    });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const listLightspeedEmployees = async (req, res) => {
  try {
    // TODO: Replace with real Lightspeed API call
    // For now, return demo data
    const employees = [
      { id: 'ls-emp-1', name: 'Jane Doe', email: 'jane@lightspeed.com' },
      { id: 'ls-emp-2', name: 'John Smith', email: 'john@lightspeed.com' },
    ];
    res.json(employees);
  } catch (err) {
    console.error('Error listing Lightspeed employees:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const uploadUserPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const userId = parseInt(req.params.id);
    // Save file as /uploads/user-<id>-<timestamp>.<ext>
    const ext = req.file.originalname.split('.').pop();
    const filename = `user-${userId}-${Date.now()}.${ext}`;
    const fs = require('fs');
    const path = require('path');
    const dest = path.join(__dirname, '../../public/uploads', filename);
    fs.renameSync(req.file.path, dest);
    const photoUrl = `/uploads/${filename}`;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { photoUrl },
    });
    // Audit log
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'update', entity: 'User', entityId: user.id, details: `Updated profile photo` }
    });
    res.json(user);
  } catch (err) {
    console.error('Error uploading user photo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unified User Schedule Endpoints
const getUserSchedule = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const week = req.query.week ? new Date(req.query.week) : null;
    // Only self or admin can view
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    let schedule = await prisma.userSchedule.findUnique({
      where: { userId_weekStart: { userId, weekStart: week } },
    });
    if (!schedule && !week) {
      // If no default, create empty default
      schedule = await prisma.userSchedule.create({
        data: {
          userId,
          weekStart: null,
          days: JSON.stringify(Array(7).fill({ isOff: true, blocks: [] })),
        },
      });
    }
    res.json(schedule);
  } catch (err) {
    console.error('Error fetching user schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUserSchedule = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { weekStart, days } = req.body;
    // Only self or admin can update
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    let schedule = await prisma.userSchedule.findUnique({
      where: { userId_weekStart: { userId, weekStart: weekStart ? new Date(weekStart) : null } },
    });
    if (schedule) {
      schedule = await prisma.userSchedule.update({
        where: { id: schedule.id },
        data: { days: JSON.stringify(days) },
      });
    } else {
      schedule = await prisma.userSchedule.create({
        data: {
          userId,
          weekStart: weekStart ? new Date(weekStart) : null,
          days: JSON.stringify(days),
        },
      });
    }
    res.json(schedule);
  } catch (err) {
    console.error('Error updating user schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const confirmUserSchedule = async (req, res) => {
  // For now, just a stub (could set a confirmed flag or log confirmation)
  res.json({ confirmed: true });
};

const getUserScheduleConflicts = async (req, res) => {
  // For now, just a stub (would check appointments/alterations vs. schedule)
  res.json({ conflicts: [] });
};

// Returns a flat array of all users (local and Lightspeed) with id, name, email, photoUrl
const getAllUsersSimple = async (req, res) => {
  try {
    // Local users
    const localUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
      },
      orderBy: { name: 'asc' }
    });

    // Lightspeed users
    let lightspeedUsers = [];
    try {
      const lightspeedClient = createLightspeedClient(null);
      const lsRes = await lightspeedClient.get('/users');
      lightspeedUsers = (lsRes.data.data || []).map(user => ({
        id: user.id,
        name: user.display_name || user.name || '',
        email: user.email || '',
        photoUrl: user.image_source || user.image || user.avatar || user.photo || user.profile_image || null,
      }));
    } catch (err) {
      logger.warn('[Users] Could not fetch users from Lightspeed:', err.message);
    }

    // Merge and dedupe by email (prefer local if exists)
    const allUsersMap = new Map();
    for (const u of [...lightspeedUsers, ...localUsers]) {
      if (!allUsersMap.has(u.email)) {
        allUsersMap.set(u.email, u);
      }
    }
    const allUsers = Array.from(allUsersMap.values());
    res.json(allUsers);
  } catch (err) {
    logger.error('[Users] Error in getAllUsersSimple:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

module.exports = {
  getUsers,
  getCurrentUser,
  listUsers,
  listLightspeedEmployees,
  getUser,
  updateUser,
  deleteUser,
  uploadUserPhoto,
  getUserSchedule,
  updateUserSchedule,
  confirmUserSchedule,
  getUserScheduleConflicts,
  getAllUsersSimple,
}; 