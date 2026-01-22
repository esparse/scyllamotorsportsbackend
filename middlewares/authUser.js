const jwt = require("jsonwebtoken");
const Team = require("../models/Team");
const Member = require("../models/Member");
const Vendor = require("../models/Vendor")

module.exports = (roles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user = null;
      let userRole = decoded.role || "";

      // Fetch Team admin
      if (userRole.toLowerCase() === "team" || userRole.toUpperCase() === "TEAM_ADMIN") {
        user = await Team.findById(decoded.id).lean();
        userRole = "TEAM_ADMIN";
      }
      // Fetch Member
      else if (userRole.toUpperCase() === "MEMBER" || userRole.toLowerCase() === "member") {
        user = await Member.findById(decoded.id).lean();
        userRole = "MEMBER";
      }

      else if (userRole.toLowerCase() === "vendor" || userRole.toUpperCase() === "VENDOR"){
        user = await Vendor.findById(decoded.id).lean();
        userRole = "VENDOR";
      }

      if (!user) return res.status(404).json({ error: "User not found" });

      req.user = user;
      req.user.role = userRole; // attach normalized role

      // Role-based access check
      if (roles.length && !roles.includes(userRole)) {
        return res.status(403).json({ error: "Access denied" });
      }

      next();
    } catch (err) {
      console.error(err);
      return res.status(401).json({ error: "Invalid token" });
    }
  };
};


// const jwt = require("jsonwebtoken");
// const Team = require("../models/Team");
// const Member = require("../models/Member");

// const authUser = (allowedRoles = []) => {
//   return async (req, res, next) => {
//     try {
//       const token = req.headers.authorization?.split(" ")[1];

//       if (!token)
//         return res.status(401).json({ error: "Token missing" });

//       const decoded = jwt.verify(token, process.env.JWT_SECRET);

//       let user = null;

//       if (decoded.role === "TEAM_ADMIN") {
//         user = await Team.findById(decoded.id);
//       }

//       if (decoded.role === "MEMBER") {
//         user = await Member.findById(decoded.id);
//       }

//       if (!user)
//         return res.status(401).json({ error: "User not found" });

//       if (allowedRoles.length && !allowedRoles.includes(decoded.role))
//         return res.status(403).json({ error: "Access denied" });

//       req.user = user;              // FULL DOCUMENT
//       req.user.role = decoded.role; // normalize role

//       next();

//     } catch (err) {
//       console.error("Auth Error:", err);
//       res.status(401).json({ error: "Invalid token" });
//     }
//   };
// };

// module.exports = authUser;
