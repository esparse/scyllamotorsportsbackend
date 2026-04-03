const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const Team = require("../models/Team");
const Member = require("../models/Member");
const Vehicle = require("../models/Vehicle");
const SocialLink = require("../models/SocialLink");
const Event = require("../models/Event");
const cloudinary = require("../config/cloudinary");
const logTeamActivity = require("../utils/activityLogger");

// ─────────────────────────────────────────
// REGISTER TEAM
// ─────────────────────────────────────────
exports.registerTeam = async (req, res) => {
  try {
    const { name, tagline, email, password, contactNo, category } = req.body;

    if (!name || !email || !password || !contactNo || !category) {
      return res.status(400).json({ error: "All fields are required" });
    }

    let location;
    try {
      location = JSON.parse(req.body.location);
    } catch {
      return res.status(400).json({ error: "Invalid location data" });
    }

    const { address, lat, lng } = location;
    if (!address || typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "Please select your location from the map" });
    }

    if (!req.files?.logo || !req.files?.verificationDoc) {
      return res.status(400).json({ error: "Logo and verification document are required" });
    }

    const exists = await Team.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const logoUpload = await cloudinary.uploader.upload(req.files.logo[0].path, {
      folder: "teams/logos",
    });
    fs.unlinkSync(req.files.logo[0].path);

    const docUpload = await cloudinary.uploader.upload(req.files.verificationDoc[0].path, {
      folder: "teams/docs",
      resource_type: "auto",
    });
    fs.unlinkSync(req.files.verificationDoc[0].path);

    const hashedPassword = await bcrypt.hash(password, 10);

    const team = await Team.create({
      name,
      tagline,
      email,
      password: hashedPassword,
      contactNo,
      category,
      logo: logoUpload.secure_url,
      verificationDoc: docUpload.secure_url,
      location: { address, lat, lng },
    });

    res.status(201).json({
      success: true,
      message: "Team registered successfully. Await admin approval.",
      teamId: team._id,
    });
  } catch (err) {
    console.error("Register team error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// LOGIN TEAM (also handles member login)
// ─────────────────────────────────────────
exports.loginTeam = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 1. try team login
    const team = await Team.findOne({ email }).select("+password");

    if (team) {
      if (team.status !== "approved") {
        return res.status(403).json({ error: "Account pending admin approval" });
      }

      const isMatch = await bcrypt.compare(password, team.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: team._id, role: "TEAM_ADMIN" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        token,
        user: { id: team._id, name: team.name, role: "TEAM_ADMIN" },
      });
    }

    // 2. try member login
    const member = await Member.findOne({ email }).select("+password");

    if (!member) {
      return res.status(404).json({ error: "Account not found" });
    }

    if (!member.isActive) {
      return res.status(403).json({ error: "Please set your password first via the email link" });
    }

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: member._id, role: "MEMBER" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: member._id,
        name: member.name,
        role: "MEMBER",
        teamId: member.team,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// GET TEAM PROFILE (protected)
// ─────────────────────────────────────────
exports.getTeamProfile = async (req, res) => {
  try {
    let teamProfile = null;
    let teamId = null;

    if (req.user.role === "TEAM_ADMIN") {
      teamProfile = await Team.findById(req.user._id).lean();
      teamId = req.user._id;
    } else if (req.user.role === "MEMBER") {
      const member = await Member.findById(req.user._id).lean();
      if (!member) return res.status(404).json({ error: "Member not found" });
      teamProfile = await Team.findById(member.team).lean();
      teamId = member.team;
    }

    if (!teamProfile) return res.status(404).json({ error: "Team not found" });

    const [teamMembers, eventsCount, socialMedia] = await Promise.all([
      Member.find({ team: teamId }).lean(),
      Event.countDocuments({ "participants.team": teamId }),
      SocialLink.find({ team: teamId }).lean(),
    ]);

    res.json({
      ...teamProfile,
      members: teamMembers || [],
      eventsCount,
      socialMedia,
      gallery: teamProfile.gallery || [],
      currentMember: req.user.role === "MEMBER" ? req.user : null,
    });
  } catch (err) {
    console.error("Get team profile error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// UPDATE TEAM PROFILE
// ─────────────────────────────────────────
exports.updateTeamProfile = async (req, res) => {
  try {
    // only team admin can update
    if (req.user.role !== "TEAM_ADMIN") {
      return res.status(403).json({ error: "Only team admin can update team details" });
    }

    const team = await Team.findById(req.team._id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const { name, tagline, contactNo, category, description } = req.body;

    if (name)        team.name = name;
    if (tagline)     team.tagline = tagline;
    if (contactNo)   team.contactNo = contactNo;
    if (category)    team.category = category;
    if (description) team.description = description;

    if (req.body.location) {
      try {
        const loc = typeof req.body.location === "string"
          ? JSON.parse(req.body.location)
          : req.body.location;

        team.location = {
          address: loc.address || team.location.address,
          lat: loc.lat !== undefined ? Number(loc.lat) : team.location.lat,
          lng: loc.lng !== undefined ? Number(loc.lng) : team.location.lng,
        };
      } catch {
        return res.status(400).json({ error: "Invalid location format" });
      }
    }

    if (req.files?.logo?.[0]) {
      const logoUpload = await cloudinary.uploader.upload(req.files.logo[0].path, {
        folder: "teams/logos",
      });
      fs.unlinkSync(req.files.logo[0].path);
      team.logo = logoUpload.secure_url;
    }

    if (req.files?.verificationDoc?.[0]) {
      const docUpload = await cloudinary.uploader.upload(req.files.verificationDoc[0].path, {
        folder: "teams/docs",
        resource_type: "auto",
      });
      fs.unlinkSync(req.files.verificationDoc[0].path);
      team.verificationDoc = docUpload.secure_url;
    }

    await team.save();

    await logTeamActivity(
      team._id,
      "TEAM_UPDATED",
      "Profile updated",
      "Team profile was updated"
    );

    res.json({ success: true, message: "Profile updated", team });
  } catch (err) {
    console.error("Update team profile error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// GET ALL APPROVED TEAMS (public)
// ─────────────────────────────────────────
exports.getAllApprovedTeams = async (req, res) => {
  try {
    const teams = await Team.find({ status: "approved" })
      .select(
        "name description tagline logo category location eventsParticipated eventsWon createdAt"
        // add 'banner' here once banner field is added to model
      )
      .sort({ createdAt: -1 })
      .lean();

    const teamsWithDetails = await Promise.all(
      teams.map(async (team) => {
        const [members, vehicles] = await Promise.all([
          Member.find({ team: team._id })
            .select("name role profilePic bio")
            .lean(),
          Vehicle.find({ team: team._id })
            .select("name type image year")
            .lean(),
        ]);

        return {
          ...team,
          members,
          vehicles,
          // banner: team.banner || null,
        };
      })
    );

    res.json({ success: true, teams: teamsWithDetails });
  } catch (err) {
    console.error("Get all teams error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// UPLOAD GALLERY
// ─────────────────────────────────────────
exports.uploadGallery = async (req, res) => {
  try {
    const team = await Team.findById(req.team._id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const urls = await Promise.all(
      req.files.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "gallery",
        });
        fs.unlinkSync(file.path);
        return result.secure_url;
      })
    );

    team.gallery.unshift(...urls);
    await team.save();

    await logTeamActivity(
      team._id,
      "GALLERY_UPDATED",
      "Gallery updated",
      "New images added to gallery"
    );

    res.json({ success: true, gallery: team.gallery });
  } catch (err) {
    console.error("Upload gallery error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// DELETE GALLERY IMAGE
// ─────────────────────────────────────────
exports.deleteGalleryMedia = async (req, res) => {
  try {
    const { mediaUrl } = req.query;
    if (!mediaUrl) return res.status(400).json({ error: "Media URL is required" });

    const team = await Team.findById(req.team._id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    team.gallery = team.gallery.filter((url) => url !== mediaUrl);
    await team.save();

    res.json({ success: true, gallery: team.gallery });
  } catch (err) {
    console.error("Delete gallery error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// ADD SOCIAL LINK
// ─────────────────────────────────────────
exports.addSocialLink = async (req, res) => {
  try {
    const { platform, handle, url, icon } = req.body;

    if (!platform || !url) {
      return res.status(400).json({ error: "Platform and URL are required" });
    }

    const link = await SocialLink.create({
      team: req.team._id,
      platform,
      handle,
      url,
      icon: icon || "",
    });

    res.status(201).json({ success: true, link });
  } catch (err) {
    console.error("Add social link error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// DELETE SOCIAL LINK
// ─────────────────────────────────────────
exports.deleteSocialLink = async (req, res) => {
  try {
    const link = await SocialLink.findOne({
      _id: req.params.id,
      team: req.team._id,
    });

    if (!link) return res.status(404).json({ error: "Link not found" });

    await link.deleteOne();

    res.json({ success: true, message: "Social link deleted" });
  } catch (err) {
    console.error("Delete social link error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};