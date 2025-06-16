module.exports = function requireAuth(req, res, next) {
  // TODO: Replace with real JWT/session validation
  // For demo, always use admin user
  req.user = { id: 1, email: 'admin@demo.com' };
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}; 