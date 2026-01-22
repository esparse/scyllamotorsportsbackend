const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Admin access only" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure decoded has id and role
    if (!decoded.id || decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access only" });
    }

    req.user = { id: decoded.id, role: decoded.role }; // attach minimal info
    next();
  } catch (err) {
    console.error("JWT Error:", err);
    return res.status(401).json({ error: "Admin access only" });
  }
};
