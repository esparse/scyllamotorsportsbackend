const jwt = require("jsonwebtoken");
const Team = require("../models/Team");

const teamAuth = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Team access only" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const team = await Team.findById(decoded.id);
    if (!team) return res.status(401).json({ error: "Team access only" });

    req.team = team; // attach team data to request
    next();
  } catch (err) {
    res.status(401).json({ error: "Team access only" });
  }
};

module.exports = teamAuth;


// const jwt = require("jsonwebtoken");
// const Team = require("../models/Team");
// const Member = require("../models/Member");

// /**
//  * TEAM AUTH MIDDLEWARE
//  * @param {Array} allowedRoles - ["TEAM_ADMIN", "TEAM_MANAGER", "MEMBER"]
//  */
// const teamAuth = (allowedRoles = []) => {
//   return async (req, res, next) => {
//     try {
//       const token = req.header("Authorization")?.replace("Bearer ", "");
//       if (!token) {
//         return res.status(401).json({ message: "Token missing" });
//       }

//       const decoded = jwt.verify(token, process.env.JWT_SECRET);

//       // ❌ Block non-team users
//       if (decoded.accountType !== "TEAM") {
//         return res.status(403).json({ message: "Team access only" });
//       }

//       // 🔹 TEAM ADMIN
//       if (decoded.role === "TEAM_ADMIN") {
//         const team = await Team.findById(decoded.id);
//         if (!team) {
//           return res.status(401).json({ message: "Team not found" });
//         }

//         req.team = team;
//         req.user = decoded;
//       }

//       // 🔹 TEAM MEMBER / MANAGER
//       else {
//         const member = await Member.findById(decoded.id).populate("team");
//         if (!member) {
//           return res.status(401).json({ message: "Member not found" });
//         }

//         req.member = member;
//         req.team = member.team;
//         req.user = decoded;
//       }

//       // 🔐 ROLE CHECK
//       if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
//         return res.status(403).json({ message: "Permission denied" });
//       }

//       next();
//     } catch (error) {
//       console.error(error);
//       return res.status(401).json({ message: "Invalid or expired token" });
//     }
//   };
// };

// module.exports = teamAuth;
