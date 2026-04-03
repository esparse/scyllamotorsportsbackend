const Vehicle = require("../models/Vehicle");
const Team = require("../models/Team");
const Member = require("../models/Member");
const Event = require("../models/Event");

const getTeamProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not found" });

    let teamProfile = null;

    if (req.user.role === "TEAM_ADMIN") {
      teamProfile = await Team.findById(req.user.id).lean();
    } else if (req.user.role === "MEMBER") {
      const member = await Member.findById(req.user.id).lean();
      if (!member) return res.status(404).json({ error: "Member not found" });
      teamProfile = await Team.findById(member.team).lean();
    } else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    if (!teamProfile) return res.status(404).json({ error: "Team not found" });

    const teamId = teamProfile._id;

    const [teamMembers, eventsCount] = await Promise.all([
      Member.find({ team: teamId }).lean(),
      Event.countDocuments({ "participants.team": teamId }),
    ]);

    const mediaUrls = (teamProfile.media || []).map(
      (file) => `${req.protocol}://${req.get("host")}/${file}`,
    );

    return res.json({
      ...teamProfile,
      media: mediaUrls,
      achievements: teamProfile.achievements || [],
      gallery: teamProfile.gallery || [],
      members: teamMembers || [],
      eventsCount,
      currentMember: req.user.role === "MEMBER" ? req.user : null,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server error", err: err.message });
  }
};

const getVehicleCount = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not found" });

    let teamId = null;

    if (req.user.role === "TEAM_ADMIN") {
      teamId = req.user.id;
    } else if (req.user.role === "MEMBER") {
      const member = await Member.findById(req.user.id).lean();
      if (!member) return res.status(404).json({ error: "Member not found" });
      teamId = member.team;
    } else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    const vehicleCount = await Vehicle.countDocuments({ team: teamId });

    return res.json({ count: vehicleCount });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server error", err: err.message });
  }
};

const eventsParticipated = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not found" });
    let teamId = null;

    if (req.user.role === "TEAM_ADMIN") {
      teamId = req.user._id;
    } else if (req.user.role === "MEMBER") {
      const member = await Member.findById(req.user.id).lean();
      if (!member) return res.status(404).json({ error: "Member not found" });
      teamId = member.team;
    } else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    const eventCount = await Event.countDocuments({
      participants: {
        $elemMatch: {
          team: teamId,
          status: "approved",
        },
      },
    });

    const eventWonCount = await Event.countDocuments({
      participants: {
        $elemMatch: { team: teamId, position: 1, status: "approved" },
      },
    });

    return res.json({ eventsParticipated: eventCount, eventsWon: eventWonCount });


  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server error", err: err.message });
  }
};

module.exports = {
  getTeamProfile,
  getVehicleCount,
  eventsParticipated,
};
