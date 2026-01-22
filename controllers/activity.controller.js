// const TeamActivity = require("../models/TeamActivity");

// exports.getTeamActivities = async (req, res) => {
//   try {
//     if (!req.user) return res.status(401).json({ error: "User not found" });

//     let teamId = null;

//     if (req.user.role === "TEAM_ADMIN") {
//       teamId = req.user._id;
//     } else if (req.user.role === "MEMBER") {
//       teamId = req.user.team;
//     }

//     if (!teamId) return res.status(400).json({ error: "Team ID not found" });

//     const activities = await TeamActivity.find({ team: teamId })
//       .sort({ createdAt: -1 })
//       .lean();

//     res.json({ success: true, activities });
//   } catch (err) {
//     console.error("cannot fetch activities due to:", err.message);
//     res.status(500).json({ error: "Server error" });
//   }
// };


const TeamActivity = require("../models/TeamActivity");

exports.getTeamActivities = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not found" });

    // Determine the team ID based on user role
    let teamId = null;

    if (req.user.role === "TEAM_ADMIN") {
      teamId = req.user._id;
    } else if (req.user.role === "MEMBER") {
      teamId = req.user.team;
    }

    if (!teamId) return res.status(400).json({ error: "Team ID not found" });

    // Fetch all activities for the team, sorted by latest first
    const activities = await TeamActivity.find({ team: teamId })
      .sort({ createdAt: -1 })
      .lean(); // Convert to plain JS objects

    // Return activities directly as res.data for frontend
    res.json(activities || []);

  } catch (err) {
    console.error("Cannot fetch activities due to:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};
