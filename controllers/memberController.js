const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const Member = require("../models/Member");
const Team = require("../models/Team");
const cloudinary = require("../config/cloudinary");
const sendMail = require("../utils/mailer");
const logTeamActivity = require("../utils/activityLogger");

// ─────────────────────────────────────────
// ADD MEMBER
// ─────────────────────────────────────────
exports.addMember = async (req, res) => {
  try {
    const { name, role, bio, email } = req.body;

    if (!name || !role || !email) {
      return res
        .status(400)
        .json({ error: "Name, role and email are required" });
    }

    // check duplicate
    const exists = await Member.findOne({
      team: req.team._id,
      email: email.toLowerCase(),
    });
    if (exists) {
      return res
        .status(400)
        .json({ error: "Member with this email already exists" });
    }

    // temp password + setup token
    const tempPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const setupToken = crypto.randomBytes(32).toString("hex");

    const member = await Member.create({
      team: req.team._id,
      name,
      role,
      bio: bio || "",
      email,
      password: hashedPassword,
      profilePic: req.team.logo,
      isActive: false,
      passwordSetupToken: setupToken,
      passwordSetupExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    // add member ref to team
    await Team.findByIdAndUpdate(req.team._id, {
      $push: { members: member._id },
    });

    // send setup email
    const setupLink = `${process.env.MEMBER_URL}/member/set-password/${setupToken}`;
    await sendMail({
      to: email,
      subject: "Set your team account password",
      html: `
        <p>You have been added to a team.</p>
        <p>Click below to set your password:</p>
        <a href="${setupLink}">${setupLink}</a>
        <p>This link expires in 24 hours.</p>
      `,
    }).catch((err) => console.error("Email failed:", err.message));

    await logTeamActivity(
      req.team._id,
      "MEMBER_ADDED",
      "New member added",
      `${name} joined the team`,
    );

    res.status(201).json({ success: true, message: "Member added", member });
  } catch (err) {
    console.error("Add member error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// GET ALL MEMBERS OF A TEAM
// ─────────────────────────────────────────
exports.getMembers = async (req, res) => {
  try {
    let teamId = null;

    if (req.user.role === "TEAM_ADMIN") {
      teamId = req.user._id;
    } else if (req.user.role === "MEMBER") {
      teamId = req.user.team;
    } else {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const members = await Member.find({ team: teamId }).lean();
    res.json(members);
  } catch (err) {
    console.error("Get members error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// GET SINGLE MEMBER
// ─────────────────────────────────────────
exports.getMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).lean();
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // make sure member belongs to this team
    if (member.team.toString() !== req.team._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(member);
  } catch (err) {
    console.error("Get member error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// UPDATE MEMBER (admin only)
// ─────────────────────────────────────────
exports.updateMember = async (req, res) => {
  try {
    if (req.user.role !== "TEAM_ADMIN") {
      return res
        .status(403)
        .json({ error: "Only team admin can update members" });
    }

    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (member.team.toString() !== req.team._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { role, bio } = req.body;

    if (role) member.role = role;
    if (bio) member.bio = bio;

    await member.save();

    await logTeamActivity(
      req.team._id,
      "MEMBER_UPDATED",
      "Member updated",
      `${member.name}'s details were updated`,
    );

    res.json({ success: true, member });
  } catch (err) {
    console.error("Update member error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// DELETE MEMBER
// ─────────────────────────────────────────
exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // authorization check
    if (member.team.toString() !== req.team._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // delete member
    await Member.findByIdAndDelete(member._id);

    // remove from team
    await Team.findByIdAndUpdate(req.team._id, {
      $pull: { members: member._id },
    });

    // log activity
    await logTeamActivity(
      req.team._id,
      "MEMBER_REMOVED",
      "Member removed",
      `${member.name} was removed from the team`
    );

    
    try {
      const sendMail = require("../utils/mailer");

      await sendMail({
        to: member.email,
        subject: `Removed from ${req.team.name}`,
        text: `You have been removed from team ${req.team.name}. If this is a mistake, contact admin.`,
      });
    } catch (mailErr) {
      console.error("Email failed:", mailErr.message);
      // ❗ don't fail API because of email
    }

    
    return res.json({
      success: true,
      message: "Member removed successfully",
    });

  } catch (err) {
    console.error("Delete member error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
// ─────────────────────────────────────────
// SET PASSWORD (from email link)
// ─────────────────────────────────────────
exports.setMemberPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res
        .status(400)
        .json({ error: "Both password fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const member = await Member.findOne({
      passwordSetupToken: token,
      passwordSetupExpires: { $gt: Date.now() },
    }).select("+password");

    if (!member) {
      return res.status(400).json({ error: "Invalid or expired link" });
    }

    member.password = await bcrypt.hash(password, 10);
    member.isActive = true;
    member.passwordSetupToken = undefined;
    member.passwordSetupExpires = undefined;

    await member.save();

    res.json({ success: true, message: "Password set. You can now log in." });
  } catch (err) {
    console.error("Set password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// UPLOAD CERTIFICATE
// ─────────────────────────────────────────
exports.uploadCertificate = async (req, res) => {
  try {
    const { name, expiryDate } = req.body;

    if (!name || !expiryDate) {
      return res
        .status(400)
        .json({ error: "Certificate name and expiry date required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Certificate file required" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "member-certificates",
      resource_type: "auto",
    });
    fs.unlinkSync(req.file.path);

    const member = await Member.findById(req.user._id);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const certificate = { name, url: result.secure_url, expiryDate };
    member.certificates.push(certificate);
    await member.save();

    res
      .status(201)
      .json({ success: true, message: "Certificate uploaded", certificate });
  } catch (err) {
    console.error("Upload certificate error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// GET MY CERTIFICATES
// ─────────────────────────────────────────
exports.getMyCertificates = async (req, res) => {
  try {
    const member = await Member.findById(req.user._id).select("certificates");
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const today = new Date();

    const certificates = member.certificates.map((cert) => {
      const daysLeft = Math.ceil(
        (new Date(cert.expiryDate) - today) / (1000 * 60 * 60 * 24),
      );

      let status = "safe";
      if (daysLeft <= 15) status = "danger";
      else if (daysLeft <= 45) status = "warning";

      return { ...cert.toObject(), daysLeft, status };
    });

    res.json(certificates);
  } catch (err) {
    console.error("Get certificates error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};
