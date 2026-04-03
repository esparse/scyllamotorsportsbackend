const Vehicle = require("../models/Vehicle");
const Team = require("../models/Team");
const Member = require("../models/Member");
const Event = require("../models/Event");
const cloudinary = require("../config/cloudinary"); // adjust path

const multer = require("multer");

// ─────────────────────────────────────────
// MULTER SETUP
// ─────────────────────────────────────────
const uploadSponsor = multer({ storage: multer.memoryStorage() });

// ─────────────────────────────────────────
// HELPER — get teamId from req.user
// ─────────────────────────────────────────
const getTeamId = async (user) => {
  if (user.role === "TEAM_ADMIN") return user._id || user.id;

  if (user.role === "MEMBER") {
    const member = await Member.findById(user._id || user.id).lean();
    if (!member) throw new Error("Member not found");
    return member.team;
  }

  throw new Error("Unauthorized role");
};

// ─────────────────────────────────────────
// HELPER — admin check
// ─────────────────────────────────────────
const requireAdmin = (user) => {
  if (!user || user.role !== "TEAM_ADMIN") {
    throw new Error("Only team admin allowed");
  }
};

// ─────────────────────────────────────────
// GET TEAM PROFILE
// ─────────────────────────────────────────
const getTeamProfile = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "User not found" });

    const teamId = await getTeamId(req.user);

    const teamProfile = await Team.findById(teamId).lean();
    if (!teamProfile)
      return res.status(404).json({ error: "Team not found" });

    const [teamMembers, eventsCount] = await Promise.all([
      Member.find({ team: teamId }).lean(),
      Event.countDocuments({ "participants.team": teamId }),
    ]);

    return res.json({
      ...teamProfile,
      achievements: teamProfile.achievements || [],
      gallery: teamProfile.gallery || [],
      members: teamMembers || [],
      eventsCount,
      currentMember:
        req.user.role === "MEMBER"
          ? { id: req.user._id, role: req.user.role }
          : null,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server error",
      err: err.message,
    });
  }
};

// ─────────────────────────────────────────
// GET VEHICLE COUNT
// ─────────────────────────────────────────
const getVehicleCount = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "User not found" });

    const teamId = await getTeamId(req.user);

    const vehicleCount = await Vehicle.countDocuments({ team: teamId });

    return res.json({ count: vehicleCount });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server error",
      err: err.message,
    });
  }
};

// ─────────────────────────────────────────
// GET EVENTS PARTICIPATED
// ─────────────────────────────────────────
const eventsParticipated = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "User not found" });

    const teamId = await getTeamId(req.user);

    const [eventCount, eventWonCount] = await Promise.all([
      Event.countDocuments({
        participants: {
          $elemMatch: { team: teamId, status: "approved" },
        },
      }),
      Event.countDocuments({
        participants: {
          $elemMatch: {
            team: teamId,
            position: 1,
            status: "approved",
          },
        },
      }),
    ]);

    return res.json({
      eventsParticipated: eventCount,
      eventsWon: eventWonCount,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server error",
      err: err.message,
    });
  }
};

// ─────────────────────────────────────────
// GET ALL MEMBERS
// ─────────────────────────────────────────
const getMembers = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "User not found" });

    const teamId = await getTeamId(req.user);

    const members = await Member.find({ team: teamId })
      .select("-password -passwordSetupToken -passwordSetupExpires")
      .lean();

    return res.json({ members });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server error",
      err: err.message,
    });
  }
};

// ─────────────────────────────────────────
// REMOVE MEMBER (ADMIN ONLY)
// ─────────────────────────────────────────
const removeMember = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "User not found" });

    requireAdmin(req.user);

    const { memberId } = req.params;

    const member = await Member.findById(memberId);
    if (!member)
      return res.status(404).json({ error: "Member not found" });

    if (member.team.toString() !== (req.user._id || req.user.id).toString()) {
      return res
        .status(403)
        .json({ error: "Member does not belong to your team" });
    }

    await Member.findByIdAndDelete(memberId);

    await Team.findByIdAndUpdate(req.user._id || req.user.id, {
      $pull: { members: member._id },
    });

    return res.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server error",
      err: err.message,
    });
  }
};

// ─────────────────────────────────────────
// UPLOAD SPONSOR (ADMIN ONLY)
// ─────────────────────────────────────────
const uploadSponsorLogo = [
  uploadSponsor.single("logo"),

  async (req, res) => {
    try {
      if (!req.user)
        return res.status(401).json({ error: "User not found" });

      requireAdmin(req.user);

      if (!req.file)
        return res.status(400).json({ error: "Logo required" });

      const team = await Team.findById(req.user._id);
      if (!team)
        return res.status(404).json({ error: "Team not found" });

      const uploadToCloudinary = (buffer) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "sponsors" },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          stream.end(buffer);
        });

      const result = await uploadToCloudinary(req.file.buffer);

      const sponsor = {
        name: req.body.name || "",
        logo: result.secure_url,
        category: req.body.category || "title",
        website: req.body.website || "",
        initials:
          req.body.initials ||
          (req.body.name
            ? req.body.name.charAt(0).toUpperCase()
            : ""),
      };

      team.sponsors = [...(team.sponsors || []), sponsor];
      await team.save();

      return res.json({
        message: "Sponsor uploaded successfully",
        sponsors: team.sponsors,
      });
    } catch (err) {
      console.error("UPLOAD SPONSOR ERROR:", err.message);
      return res.status(500).json({ error: "Server error" });
    }
  },
];

// ─────────────────────────────────────────
// DELETE SPONSOR (ADMIN ONLY)
// ─────────────────────────────────────────
const deleteSponsor = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "User not found" });

    requireAdmin(req.user);

    const team = await Team.findById(req.user._id);
    if (!team)
      return res.status(404).json({ error: "Team not found" });

    const { id: sponsorId } = req.params;

    const exists = team.sponsors.some(
      (s) => s._id.toString() === sponsorId
    );

    if (!exists)
      return res.status(404).json({ error: "Sponsor not found" });

    team.sponsors = team.sponsors.filter(
      (s) => s._id.toString() !== sponsorId
    );

    await team.save();

    return res.json({
      message: "Sponsor deleted successfully",
      sponsors: team.sponsors,
    });
  } catch (err) {
    console.error("DELETE SPONSOR ERROR:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────
module.exports = {
  getTeamProfile,
  getVehicleCount,
  eventsParticipated,
  getMembers,
  removeMember,
  uploadSponsorLogo,
  deleteSponsor,
};