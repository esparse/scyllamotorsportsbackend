module.exports = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Preserve original role
  req.user._originalRole = req.user.role;

  // Normalize ONLY for chat
  if (req.user.role === "admin") {
    req.user.role = "ADMIN";
  }

  if (req.user.role === "TEAM_ADMIN") {
    req.user.role = "TEAM";
  }

  if (req.user.role === "VENDOR") {
    req.user.role = "VENDOR";
  }

  next();
};
