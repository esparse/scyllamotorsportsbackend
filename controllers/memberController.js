const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const Member = require("../models/Member");
const cloudinary = require("../config/cloudinary");
const sendMail = require("../utils/mailer");
const logTeamActivity = require("../utils/activityLogger");
const Team = require("../models/Team")


// exports.addMember = async (req, res) => {
//   try {
//     const { name, role, bio, profilePic } = req.body;
//     let profilePicUrl = profilePic || "";

//     if (req.file) {
//       const result = await cloudinary.uploader.upload(req.file.path, { folder: "motorsport-members" });
//       profilePicUrl = result.secure_url;
//       fs.unlinkSync(req.file.path);
//     }

//     const member = new Member({ name, role, bio, profilePic: profilePicUrl });
//     await member.save();
//     res.json({ success: true, member });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
// exports.addMember = async (req, res) => {
//   try {
//     const { name, role, bio, profilePic } = req.body;

//     const member = new Member({
//       team: req.team._id,
//       name,
//       role,
//       bio: bio || "",
//       profilePic: profilePic || "/images/profile-avatar.png"
//     });

//     const savedMember = await member.save();

//     await logTeamActivity(
//       req.team._id,
//       "MEMBER_ADDED",
//       "New member added",
//       `${name} joined the team`
//     );

//     res.status(201).json(savedMember);
//     console.log("req.team:", req.team);
//     console.log("req.body:", req.body);
//     console.log("Member saved to DB:", savedMember);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };


exports.addMember = async (req, res) => {
  console.log("REQ.BODY:", req.body); // log what backend receives
  // console.log("REQ.TEAM:", req.team); // log team info

  try {
    const { name, role, bio, email,certificates } = req.body;

    if (!name || !role || !email) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    // 🔒 Prevent duplicate member (admin included)
    const existingMember = await Member.findOne({
      team: req.team._id,
      email: email.toLowerCase(),
    });

    if (existingMember) {
      return res.status(400).json({ error: "Member already exists" });
    }

    // 🔐 Temporary password (cannot login until set-password)
    const tempPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 🔑 Password setup token
    const setupToken = crypto.randomBytes(32).toString("hex");

    // 📦 Create member (profilePic = team logo)
    const member = await Member.create({
      team: req.team._id,
      name,
      role,
      bio: bio || "",
      email: email,
      password: hashedPassword,
      profilePic: req.team.logo, // ✅ default
      isActive: false,
      passwordSetupToken: setupToken,
      passwordSetupExpires: Date.now() + 24 * 60 * 60 * 1000, // 24h
      certificates,
    });

    // 📧 Send setup password email
    const setupLink = `${process.env.MEMBER_URL}/member/set-password/${setupToken}`;
    

    try {
      await sendMail({
        to: email.trim(),
        subject: "Set your team account password",
        html: `
          <p>You have been added to a team.</p>
          <p>Click below to set your password:</p>
          <a href="${setupLink}">${setupLink}</a>
          <p>This link expires in 24 hours.</p>
        `,
      });
    } catch (emailErr) {
      // console.log("Email to send setup link:", req.body.email);

      console.error("Failed to send email:", emailErr.message);
      // return res.status(500).json({ error: "Failed to send setup email" });
    }

    // 🧾 Log activity
    await logTeamActivity(
      req.team._id,
      "MEMBER_ADDED",
      "New member added",
      `${name} joined the team`
    );

    res.status(201).json({
      success: true,
      message: "Member added successfully",
      member
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.setMemberPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ error: "Password fields required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // 🔍 find member by token
    const member = await Member.findOne({
      passwordSetupToken: token,
      passwordSetupExpires: { $gt: Date.now() },
    }).select("+password");

    if (!member) {
      return res.status(400).json({
        error: "Invalid or expired setup link",
      });
    }

    // 🔐 hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ activate member
    member.password = hashedPassword;
    member.isActive = true;
    member.passwordSetupToken = undefined;
    member.passwordSetupExpires = undefined;

    await member.save();

    res.status(200).json({
      success: true,
      message: "Password set successfully. You can now log in.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// exports.getMembers = async (req, res) => {
//   try {
//     const members = await Member.find({ team: req.team._id });
//     res.status(200).json(members); // send array directly
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//     console.log("cannot fetch due to: ",err.message)
//   }
// }
// exports.getMembers = async (req, res) => {
//   try {
//     if (!req.user) return res.status(401).json({ error: "User not found" });

//     let teamId = null;

//     if (req.user.role === "TEAM_ADMIN") {
//       teamId = req.user._id;
//     } else if (req.user.role === "MEMBER") {
//       teamId = req.user.team;
//     }

//     if (!teamId) return res.status(400).json({ error: "Team ID not found" });

//     const members = await Member.find({ team: teamId }).lean();

//     res.status(200).json({ success: true, members });
//   } catch (err) {
//     console.error("cannot fetch due to:", err.message);
//     res.status(500).json({ error: "Server error" });
//   }
// };

exports.getMembers = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not found" });

    // Determine teamId based on role
    let teamId = null;
    if (req.user.role === "TEAM_ADMIN") {
      teamId = req.user._id;  // Assuming _id in User corresponds to Team _id
    } else if (req.user.role === "MEMBER") {
      teamId = req.user.team; // Member document has `team` field
    }

    if (!teamId) return res.status(400).json({ error: "Team ID not found" });

    // Fetch all members of the team
    const members = await Member.find({ team: teamId }).lean();

    // Send the array directly
    res.json(members || []);

  } catch (err) {
    console.error("Cannot fetch members due to:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    await Member.findByIdAndDelete(req.params.id);


    await logTeamActivity(
      req.team._id,
      "MEMBER_REMOVED",
      "Member removed",
      `${member.name} was removed from team`
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateMember = async (req, res) => {
  try {
    // 🔐 ROLE CHECK
    if (req.user.role !== "TEAM_ADMIN") {
      return res.status(403).json({
        error: "Only team admin can update members",
      });
    }

    const { role, bio, certificates } = req.body;

    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // 🛑 Extra safety: member must belong to same team
    if (member.team.toString() !== req.team._id.toString()) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    // ❌ EMAIL NEVER UPDATED
    member.role = role ?? member.role;
    member.bio = bio ?? member.bio;
    member.certificates = certificates ?? member.certificates;

    await member.save();

    await logTeamActivity(
      req.team._id,
      "MEMBER_UPDATED",
      "Member updated",
      `${member.name}'s details were updated`
    );

    res.json({
      success: true,
      member,
    });
  } catch (err) {
    console.error("Update member error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// get my profile based on member log in 

// exports.getMyProfile = async (req, res) => {
//   try {
//     if (!req.user) return res.status(401).json({ error: "User not found" });
    
//     const memberId = req.user._id;
    
//     // Fetch only the member's own data
//     const member = await Member.findById(memberId).lean();
//     console.log(member)
//     if (!member) return res.status(404).json({ error: "Member not found" });

//     res.status(200).json({ member });
//   } catch (err) {
//     console.error("Cannot fetch member profile due to:", err.message);
//     res.status(500).json({ error: "Server error" });
//   }
// };

exports.getMyProfile = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "Unauthorized" });

    // TEAM ADMIN
    if (req.user.role === "TEAM_ADMIN") {
      const team = await Team.findById(req.user._id).lean();
      if (!team) return res.status(404).json({ error: "Team not found" });

      return res.status(200).json({
        role: "TEAM_ADMIN",
        team,
      });
    }

    // MEMBER
    if (req.user.role === "MEMBER") {
      const member = await Member.findById(req.user._id)
        .populate("team", "name logo")
        .lean();

      if (!member) return res.status(404).json({ error: "Member not found" });

      return res.status(200).json({
        role: "MEMBER",
        member,
        team: member.team,
      });
    }

    return res.status(403).json({ error: "Invalid role" });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// update member's individual profile
// memberController.js
exports.updateMyProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not found" });
    }

    const { name, bio, phone, location } = req.body;

    const member = await Member.findById(req.user._id);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // text fields
    if (name !== undefined) member.name = name;
    if (bio !== undefined) member.bio = bio;
    if (phone !== undefined) member.phone = phone;
    if (location !== undefined) member.location = location;

    // 🔥 PROFILE PIC UPLOAD (THE REAL FIX)
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);

      member.profilePic = result.secure_url;

      // optional: remove temp file
      fs.unlinkSync(req.file.path);
    }

    await member.save();

    res.status(200).json({ member });
  } catch (err) {
    console.error("Cannot update member profile:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// upload certificate
// upload certificate (member)
exports.uploadCertificate = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "Unauthorized" });

    const { name, expiryDate } = req.body;

    if (!name || !expiryDate) {
      return res
        .status(400)
        .json({ error: "Certificate name and expiry date required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Certificate file required" });
    }

    // upload to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "member-certificates",
      resource_type: "auto",
    });

    // delete local file
    fs.unlinkSync(req.file.path);

    // find member
    const member = await Member.findById(req.user._id);
    if (!member)
      return res.status(404).json({ error: "Member not found" });

    const certificate = {
      name,
      url: result.secure_url,
      expiryDate,
    };

    member.certificates.push(certificate);
    await member.save();

    res.status(201).json({
      success: true,
      message: "Certificate uploaded successfully",
      certificate,
    });
  } catch (err) {
    console.error("Certificate upload error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getMyCertificates = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "Unauthorized" });

    const member = await Member.findById(req.user._id).select("certificates");
    if (!member)
      return res.status(404).json({ error: "Member not found" });

    const today = new Date();

    const certificates = member.certificates.map(cert => {
      const daysLeft = Math.ceil(
        (new Date(cert.expiryDate) - today) / (1000 * 60 * 60 * 24)
      );

      let status = "safe";
      if (daysLeft <= 15) status = "danger";
      else if (daysLeft <= 45) status = "warning";

      return {
        ...cert.toObject(),
        daysLeft,
        status,
      };
    });

    res.status(200).json(certificates);
  } catch (err) {
    console.error("Fetch certificate error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};
