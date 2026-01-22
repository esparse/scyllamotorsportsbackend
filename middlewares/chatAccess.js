/**
 * Chat Access Middleware
 * Allows only ADMIN, TEAM, VENDOR
 */

module.exports = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const allowedRoles = ["ADMIN", "TEAM", "VENDOR"];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: "You are not allowed to access chat"
    });
  }

  next();
};
