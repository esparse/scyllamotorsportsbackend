const Team = require("../models/Team");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const logTeamActivity = require("../utils/activityLogger");
const path = require("path")
const jwt = require("jsonwebtoken");
// const  CloudinaryStorage  = require("multer-storage-cloudinary");
const Member = require("../models/Member")
const Vehicle = require("../models/Vehicle")
const Admin = require("../models/Admin")



// Multer temp storage
const upload = multer({ dest: "uploads/" });

// Middleware
exports.uploadTeamFiles = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "verificationDoc", maxCount: 1 }
]);

// const storage = new CloudinaryStorage({
//   cloudinary,           // <-- your configured cloudinary
//   params: {
//     folder: "sponsors", // folder on Cloudinary
//     allowed_formats: ["jpg", "jpeg", "png", "webp"],
//     public_id: (req, file) => Date.now() + "-" + file.originalname,
//   },
// });
// const galleryStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: "gallery",   // Cloudinary folder name
//     allowed_formats: ["jpg", "jpeg", "png", "webp"],
//     public_id: (req, file) =>
//       `gallery-${req.team._id}-${Date.now()}`
//   }
// });






// Register Team
exports.registerTeam = async (req, res) => {
  try {
    const {
      name,
      tagline,
      email,
      contactNo,
      category
    } = req.body;

    let location;

    try {
      location = JSON.parse(req.body.location);
    } catch (err) {
      return res.status(400).json({
        error: "Invalid location data"
      });
    }

    const { address, lat, lng } = location;

    if (!address || typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({
        error: "Please select your location from the map"
      });
    }



    if (!req.files?.logo || !req.files?.verificationDoc) {
      return res.status(400).json({ error: "Files missing" });
    }

    // Upload logo
    const logoUpload = await cloudinary.uploader.upload(
      req.files.logo[0].path,
      { folder: "teams/logos" }
    );

    // Upload verification document
    const docUpload = await cloudinary.uploader.upload(
      req.files.verificationDoc[0].path,
      { folder: "teams/docs", resource_type: "auto" }
    );

    // Clean temp files
    fs.unlinkSync(req.files.logo[0].path);
    fs.unlinkSync(req.files.verificationDoc[0].path);

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const team = new Team({
      name,
      tagline,
      email,
      contactNo,
      category,
      logo: logoUpload.secure_url,
      verificationDoc: docUpload.secure_url,
      password: hashedPassword,
      location: {
        address,
        lat,
        lng
      }


    });


    await team.save();

    res.status(201).json({
      success: true,
      message: "Team registered. Await admin approval.",
      teamId: team._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


//Login Team

// exports.loginTeam = async (req, res) => {

//   const { email, password } = req.body;

//   const team = await Team.findOne({ email }).select("+password");

//   if (!team) return res.status(404).json({ error: "Account not found" });

//   if (team.status !== "approved") {
//     return res.status(403).json({ error: "Account pending admin approval" });
//   }

//   const isMatch = await bcrypt.compare(password, team.password);
//   if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

//   const token = jwt.sign(
//     { id: team._id, role: "team" },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );

//   res.json({
//     token,
//     team: {
//       id: team._id,
//       name: team.name,
//       role: "team"
//     }
//   });
// };


exports.loginTeam = async (req, res) => {
  const { email, password } = req.body;

  // =========================
  // 1. TRY TEAM LOGIN FIRST
  // =========================
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
      {
        id: team._id,
        role: "TEAM_ADMIN"   // <-- set correct role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }  // or your desired expiry
    );

    return res.json({
      token,
      user: {
        id: team._id,
        name: team.name,
        role: "TEAM_ADMIN"
      }
    });
  }

  // =========================
  // 2. TRY MEMBER LOGIN
  // =========================
  const member = await Member.findOne({ email }).select("+password");

  if (!member) {
    return res.status(404).json({ error: "Account not found" });
  }

  if (!member.isActive) {
    return res.status(403).json({ error: "Password not set" });
  }

  const isMatch = await bcrypt.compare(password, member.password);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      id: member._id,
      role: "MEMBER"   // <-- set correct role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );


  res.json({
    token,
    user: {
      id: member._id,
      name: member.name,
      role: "MEMBER",
      teamId: member.team
    }
  });
};


// get Team profile





// exports.getTeamProfile = async (req, res) => {
//   try {
//     // console.log("req.team:", req.team);
//     // const teamId = req.user.role === "MEMBER" ? req.user.team : req.user._id;

//     const team = await Team.findById(req.team._id)
//     // .populate("vehicles")
//     // .populate("members");

//     // console.log("team fetched:", team);

//     if (!team) return res.status(404).json({ error: "Team not found" });
//     // Include media URLs in response
//     const mediaUrls = (team.media || []).map(
//       (file) => `${req.protocol}://${req.get("host")}/${file}`
//     );

//     res.json({ ...team.toObject(), media: mediaUrls, achievements: team.achievements || [], gallery: team.gallery || [] });
//     // res.json(team);
//   } catch (err) {
//     console.error(err); // print full error in console
//     res.status(500).json({ error: "Server error" });
//   }
// };



// teamController.js



exports.getTeamProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not found" });

    let teamProfile = null;
    let teamId = null;

    if (req.user.role === "TEAM_ADMIN") {
      // TEAM_ADMIN → fetch their own team
      teamProfile = await Team.findById(req.user._id).lean();
      teamId = teamProfile._id;
    } else if (req.user.role === "MEMBER") {
      // MEMBER → fetch the team of the member
      const member = await Member.findById(req.user._id).lean();
      if (!member) return res.status(404).json({ error: "Member not found" });

      teamProfile = await Team.findById(member.team).lean();
      teamId = member.team;
    }

    if (!teamProfile) return res.status(404).json({ error: "Team not found" });

    // Include media URLs if needed
    const mediaUrls = (teamProfile.media || []).map(
      (file) => `${req.protocol}://${req.get("host")}/${file}`
    );

    // Fetch all members of this team
    const teamMembers = await Member.find({ team: teamId }).lean();

    const socialMedia = await SocialLink.find({ team: teamId }).lean();

    res.json({
      ...teamProfile,
      media: mediaUrls,
      achievements: teamProfile.achievements || [],
      gallery: teamProfile.gallery || [],
      members: teamMembers || [],               // array of team members
      currentMember: req.user.role === "MEMBER" ? req.user : null, // optional
      socialMedia,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};




// Update team profile
exports.updateTeamProfile = async (req, res) => {
  let logoUpload = null;
  let docUpload = null;

  try {
    const team = await Team.findById(req.team.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    // Use req.body for text fields
    const { name, tagline, contactNo, category, description, location } = req.body;

    if (name) team.name = name;
    if (tagline) team.tagline = tagline;
    if (contactNo) team.contactNo = contactNo;
    if (category) team.category = category;
    if (description) team.description = description;
    if (location) {
      try {
        const loc = typeof location === "string" ? JSON.parse(location) : location;

        team.location = {
          address: loc.address || team.location.address,
          lat: loc.lat !== undefined && loc.lat !== null ? Number(loc.lat) : team.location.lat,
          lng: loc.lng !== undefined && loc.lng !== null ? Number(loc.lng) : team.location.lng
        }

      } catch (err) {
        return res.status(400).json({ error: "Invalid location format" });
      }
    }





    // 🔹 Social media (KEEP VARIABLE NAME)
    // if (socialMedia) {
    //   let sm = {};

    //   if (typeof socialMedia === "string") {
    //     try {
    //       sm = JSON.parse(socialMedia);
    //     } catch (err) {
    //       return res.status(400).json({ error: "Invalid socialMedia format" });
    //     }
    //   } else if (typeof socialMedia === "object") {
    //     sm = socialMedia;
    //   }

    //   team.socialMedia = {
    //     ...team.socialMedia,
    //     ...sm
    //   };
    // }

    // 🔹 Logo upload (Cloudinary)
    if (req.files?.logo?.[0]) {
      logoUpload = await cloudinary.uploader.upload(
        req.files.logo[0].path,
        { folder: "teams/logos" }
      );

      // delete old logo if exists
      if (team.logo?.public_id) {
        await cloudinary.uploader.destroy(team.logo.public_id);
      }

      team.logo = logoUpload.secure_url

    }

    // 🔹 Verification doc upload (Cloudinary)
    if (req.files?.verificationDoc?.[0]) {
      docUpload = await cloudinary.uploader.upload(
        req.files.verificationDoc[0].path,
        {
          folder: "teams/docs",
          resource_type: "auto"
        }
      );

      // delete old doc if exists
      if (team.verificationDoc?.public_id) {
        await cloudinary.uploader.destroy(team.verificationDoc.public_id);
      }

      team.verificationDoc = docUpload.secure_url
    }
    await team.save();

    await logTeamActivity(
      team._id,
      "TEAM_UPDATED",
      "Profile updated",
      "Team profile information was updated"
    );

    res.json({ success: true, message: "Profile updated", team });

  } catch (err) {
    console.error(err);

    // rollback new uploads if error
    if (logoUpload?.public_id) {
      await cloudinary.uploader.destroy(logoUpload.public_id);
    }
    if (docUpload?.public_id) {
      await cloudinary.uploader.destroy(docUpload.public_id);
    }

    res.status(500).json({ error: "Server error" });

  } finally {
    // 🔹 clean temp files
    if (req.files?.logo?.[0]?.path) {
      fs.unlink(req.files.logo[0].path, () => { });
    }
    if (req.files?.verificationDoc?.[0]?.path) {
      fs.unlink(req.files.verificationDoc[0].path, () => { });
    }
  }
};


exports.uploadTeamMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const destFolder = path.join(__dirname, "../uploads/teams/media");
    if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });

    const uniqueName = `${Date.now()}-${req.file.originalname}`;
    const newFilePath = path.join(destFolder, uniqueName);
    fs.renameSync(req.file.path, newFilePath);

    const team = await Team.findById(req.team._id);
    team.media = team.media ? [...team.media, `uploads/teams/media/${uniqueName}`] : [`uploads/teams/media/${uniqueName}`];
    await team.save();

    const mediaUrls = team.media.map(f => `${req.protocol}://${req.get("host")}/${f}`);
    await logTeamActivity(
      team._id,
      "TEAM_UPDATED",
      "Profile updated",
      "Team profile information was updated"
    );
    res.status(200).json({ message: "Media uploaded", media: mediaUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};




// Add achievement
exports.addAchievement = async (req, res) => {
  try {
    const { title, description, year } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const team = await Team.findById(req.team._id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const achievement = { title, description, year: year ? parseInt(year) : new Date().getFullYear() };
    team.achievements.push(achievement);
    await team.save();

    await logTeamActivity(
      team._id,
      "ACHIVEMENT_ADDED",
      "Achivement Added",
      "Team profile  was updated"
    );


    res.status(201).json(achievement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// delete the achivements
exports.deleteAchievement = async (req, res) => {
  try {
    const achievementId = req.params.id;

    // find the team
    const team = await Team.findById(req.team._id); // use the authenticated team
    if (!team) return res.status(404).json({ message: "Team not found" });

    // remove achievement
    const initialLength = team.achievements.length;
    team.achievements = team.achievements.filter(
      a => a._id.toString() !== achievementId
    );

    if (team.achievements.length === initialLength) {
      return res.status(404).json({ message: "Achievement not found" });
    }

    await team.save();

    res.status(200).json({ message: "Achievement deleted", id: achievementId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const uploadSponsor = multer({ storage: multer.memoryStorage() });

// add sponser logos
// Multer memory storage
exports.uploadSponsorLogo = [
  uploadSponsor.single("logo"), // multer middleware
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Logo required" });

      const team = await Team.findById(req.team._id);
      if (!team) return res.status(404).json({ error: "Team not found" });

      // Upload to Cloudinary using upload_stream
      const streamUpload = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "sponsors" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(fileBuffer);
        });
      };

      const result = await streamUpload(req.file.buffer);

      const sponsor = {
        name: req.body.name || "",
        logo: result.secure_url, // Cloudinary URL
        category: req.body.category || "title",
        website: req.body.website || "",
        initials: req.body.initials || (req.body.name ? req.body.name.charAt(0).toUpperCase() : "")

      };

      team.sponsors = team.sponsors ? [...team.sponsors, sponsor] : [sponsor];
      await team.save();

      await logTeamActivity(
        team._id,
        "SPONSOR_ADDED",
        "Sponsor logo added",
        "Team profile information was updated"
      );

      res.status(200).json({
        message: "Sponsor uploaded",
        sponsors: team.sponsors, // frontend-ready
      });
    } catch (err) {
      console.error("UPLOAD SPONSOR ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
];


// delete sponsor
exports.deleteSponsor = async (req, res) => {
  try {
    const team = await Team.findById(req.team._id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const sponsorId = req.params.id;

    // Filter out the sponsor to delete
    team.sponsors = team.sponsors.filter(
      (s) => s._id.toString() !== sponsorId
    );

    await team.save();

    await logTeamActivity(
      team._id,
      "SPONSOR_DELETED",
      "Sponsor removed",
      "Team profile information was updated"
    );

    res.status(200).json({
      message: "Sponsor deleted",
      sponsors: team.sponsors.map(s => ({ ...s.toObject(), id: s._id })),
    });
  } catch (err) {
    console.error("DELETE SPONSOR ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};


// upload media gallery
const uploadGalleryImg = multer({ storage: multer.memoryStorage() });


exports.uploadGalleryMiddleware = uploadGalleryImg.array("gallery", 10);

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "gallery" },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    ).end(buffer);
  });


exports.uploadGallery = async (req, res) => {
  try {

    const team = await Team.findById(req.team._id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // CloudinaryStorage gives URL in file.path
    const urls = [];
    for (const file of req.files) {
      const url = await uploadToCloudinary(file.buffer);
      urls.push(url);
    }

    team.gallery.unshift(...urls);
    await team.save();

    await logTeamActivity(
      team._id,
      "GALLERY_UPDATED",
      "Gallery updated",
      "Team gallery images uploaded"
    );

    res.status(200).json({
      message: "Gallery uploaded successfully",
      gallery: team.gallery
    });
    console.log("REQ FILES:", req.files);
    console.log("REQ BODY:", req.body);


  } catch (err) {
    console.error("UPLOAD GALLERY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};


// delete media gallery
exports.deleteGalleryMedia = async (req, res) => {
  try {
    const { mediaUrl } = req.query; // <-- from query param
    const team = await Team.findById(req.team._id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    team.gallery = team.gallery.filter(url => url !== mediaUrl);
    await team.save();

    res.status(200).json({ message: "Media deleted successfully", gallery: team.gallery });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};




// fetch the teams list in landing page
exports.getAllTeams = async (req, res) => {
  console.log("GET /api/teams HIT");
  try {
    const teams = await Team.find({})
      .select(
        "name tagline logo location achievements createdAt" // only public fields
      )
      .sort({ createdAt: -1 })
      .lean();

    const formattedTeams = teams.map(team => ({
      ...team,
      logo: team.logo
        ? `${req.protocol}://${req.get("host")}/${team.logo}`
        : null
    }));

    res.json(formattedTeams);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};



// fetch all team data in the landing page:
// exports.getPublicTeamProfile = async (req, res) => {
//   try {
//     const { teamId } = req.params;

//     const team = await Team.findById(teamId).lean();
//     if (!team) return res.status(404).json({ error: "Team not found" });

//     const mediaUrls = (team.media || []).map(
//       file => `${req.protocol}://${req.get("host")}/${file}`
//     );

//     const members = await Member.find({ team: teamId })
//       .select("-password -email") // hide sensitive data
//       .lean();

//     res.json({
//       ...team,
//       media: mediaUrls,
//       members
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// };

const SocialLink = require("../models/SocialLink");

// ================= ADD SOCIAL LINK =================
exports.addSocialLink = async (req, res) => {
  try {
    // req.team._id comes from your teamAuth middleware
    const teamId = req.team._id;

    const { platform, handle, url, icon } = req.body;

    const link = await SocialLink.create({
      team: teamId,
      platform,
      handle,
      url,
      icon: icon || "",
    });

    res.status(201).json(link);
  } catch (err) {
    console.error("ADD SOCIAL LINK ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ================= DELETE SOCIAL LINK =================
exports.deleteSocialLink = async (req, res) => {
  try {
    const teamId = req.team._id;
    const linkId = req.params.id;

    const link = await SocialLink.findOne({ _id: linkId, team: teamId });
    if (!link) return res.status(404).json({ error: "Link not found" });

    await link.deleteOne();

    res.status(200).json({ message: "Link deleted", id: linkId });
  } catch (err) {
    console.error("DELETE SOCIAL LINK ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all social links for the team
// exports.getSocialLinks = async (req, res) => {
//   try {
//     const teamId = req.team._id;
//     const links = await SocialLink.find({ team: teamId });
//     res.status(200).json(links);
//   } catch (err) {
//     console.error("GET SOCIAL LINKS ERROR:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// };