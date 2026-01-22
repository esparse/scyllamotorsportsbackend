const Team = require("../models/Team");
const Vendor = require("../models/Vendor");
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/mailer");
const logTeamActivity = require("../utils/activityLogger");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");


exports.upload = multer({
  storage: multer.diskStorage({}),
  limits: { fileSize: 50 * 1024 * 1024 },
}).single("file");


//Login
exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  const Admin = require("../models/Admin");
  const bcrypt = require("bcryptjs");
  const jwt = require("jsonwebtoken");

  try {
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAdminProfile = async (req, res) => {
  try {
    // req.user comes from your JWT middleware
    const admin = await Admin.findById(req.user.id).select("-password");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json(admin);
  } catch (err) {
    console.error("Error fetching admin profile:", err);
    res.status(500).json({ error: "Server error" });
  }
};


exports.updateAdmin = async (req, res) => {
  try {
    const adminId = req.user.id; // <--- safe now
    const { name, email, password } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!updatedAdmin) return res.status(404).json({ error: "Admin not found" });

    res.json({
      message: "Admin details updated successfully",
      admin: updatedAdmin,
    });
  } catch (err) {
    console.error("Error updating admin:", err);
    res.status(500).json({ error: "Server error" });
  }
};


// Pending users
exports.getPendingUsers = async (req, res) => {
  const teams = await Team.find();
  const vendors = await Vendor.find();

  res.json({ teams, vendors });
};

// Approve Team
// exports.approveTeam = async (req, res) => {
//   await Team.findByIdAndUpdate(req.params.id, { status: "approved" });
//   res.json({ message: "Team approved" });
//   await sendMail(
//       Team.email,
//       "Team Approved ✅",
//       `Your team "${team.name}" has been approved by admin.`,
//       `<h3>Hello ${team.name}</h3><p>Your team has been <b>approved</b>. You can now access the dashboard.</p>`
//     );

//     res.json({ message: "Team approved and email sent." });
// };


exports.approveTeam = async (req, res) => {
  try {
    // 1️⃣ Get team
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // 2️⃣ Approve team
    team.status = "approved";
    await team.save();

    // 3️⃣ Log FIRST activity
    await logTeamActivity(
      team._id,
      "TEAM_APPROVED",
      "Team approved",
      `Your team "${team.name}" has been approved`
    );

    res.json({ message: "Team approved" });

    // 4️⃣ Send email (non-blocking is even better)
    sendMail({
      to: team.email,
      subject: "Team Approved ✅",
      text: `Your team "${team.name}" has been approved by admin.`,
      html: `
        <h3>Hello ${team.name}</h3>
        <p>Your team has been <b>approved</b>.</p>
        <p>You can now access your dashboard.</p>
      `
    }).catch(err => {
      console.error("Email sending failed:", err.message);
    });


  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve team" });
  }
};


// Reject Team
exports.rejectTeam = async (req, res) => {
  try {
    // 1️⃣ Fetch team
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    // 2️⃣ Update status
    team.status = "rejected";
    await team.save();

    // 3️⃣ Log activity
    await logTeamActivity(
      team._id,
      "TEAM_REJECTED",
      "Team rejected",
      `Your team "${team.name}" has been rejected`
    );

    // 4️⃣ Send email asynchronously
    sendMail({
      to: team.email,
      subject:"Team Rejected ❌",
      text: `Your team "${team.name}" has been rejected by admin.`,
      html:
      `<h3>Hello ${team.name}</h3>
       <p>Your team has been <b>rejected</b>. Please contact admin for more details.</p>`
  }).catch(err => console.error("Email error:", err));

    // 5️⃣ Respond once
    res.json({ message: "Team rejected and email sent." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reject team" });
  }
};


// Approve Vendor
exports.approveVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    // await Vendor.findByIdAndUpdate(req.params.id, { status: "approved" });

    vendor.status = "approved";
    await vendor.save();


   if (vendor.email) {
  sendMail({
    to: vendor.email,
    subject: "Vendor Approved ✅",
    text: `Your vendorship "${vendor.businessName}" has been approved.`,
    html:
    `<h3>Hello ${vendor.businessName}</h3>
     <p>Your vendorship has been <b>approved</b>.</p>`
   }).catch(err => console.error("Email error nahi hua:", err.message));
}

    res.json({ message: "Vendor approved and email sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve vendor" });
  }
};


// reject vendor
exports.rejectVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    vendor.status = "rejected";
    await vendor.save()
    


    sendMail({
      to:vendor.email,
      subject:"Vendorship Rejected ❌",
      text:`Your vendorship "${vendor.businessName}" has been rejected by admin.`,
      html:
      `<h3>Hello ${vendor.businessName}</h3>
       <p>Your vendorship has been <b>rejected</b>. Please contact admin for more details.</p>`
  }).catch(err => console.error("Email error:", err));

    // 5️⃣ Respond once
    return res.json({ message: "vendor rejected and email sent." });


  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reject vendor" });
  }
}


const Product = require("../models/Product");

exports.getPendingProducts = async (req, res) => {
  const products = await Product.find({ status: "pending" });
  res.json(products);
};

exports.approveProduct = async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, { status: "approved" });
  res.json({ message: "Product approved" });
};

exports.rejectProduct = async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, { status: "rejected" });
  res.json({ message: "Product rejected" });
};


// verification docs

exports.fetchVerificationDoc = async (req, res) => {
  const teams = await Team.find(
    {},
    "name verificationDoc status createdAt"
  );

  const vendors = await Vendor.find(
    {},
    "businessName verificationDoc status createdAt"
  );

  const documents = [
    ...teams.map(team => ({
      ownerType: "Team",
      ownerId: team._id,
      ownerName: team.name,
      fileUrl: team.verificationDoc,
      status: team.status,
      submittedAt: team.createdAt,
    })),
    ...vendors.map(vendor => ({
      ownerType: "Vendor",
      ownerId: vendor._id,
      ownerName: vendor.businessName,
      fileUrl: vendor.verificationDoc,
      status: vendor.status,
      submittedAt: vendor.createdAt,
    }))
  ];

  res.json({ documents });
};


exports.updateVerificationStatus = async (req, res) => {
  const { ownerType, id } = req.params;
  const { status } = req.body; // approved | rejected

  const Model = ownerType === "Team" ? Team : Vendor;

  const owner = await Model.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!owner) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json({
    message: `${ownerType} verification ${status}`,
    status: owner.status,
  });
};


// add content in admin content moderation
exports.saveAdminContent = async (req, res) => {
  try {
    const { title, description, severity } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }

    if (!["low", "medium", "high"].includes(severity)) {
      return res.status(400).json({ error: "Invalid severity" });
    }

    // upload to cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "admin-content",
    });

    // 🔥 SINGLE ADMIN (ONLY ONE EXISTS)
    const admin = await Admin.findOne({ role: "admin" });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // 🔥 PUSH NEW CONTENT
    admin.content.push({
      fileUrl: uploadResult.secure_url,
      fileType:
        uploadResult.resource_type === "video" ? "video" : "image",
      title,
      description,
      severity,
      // status defaults to pending
    });

    await admin.save();

    res.status(201).json({
      message: "Content added successfully",
      content: admin.content[admin.content.length - 1],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// get fetch media at content moderation/admin
exports.getAdminContent = async (req, res) => {
  try {
    // since only ONE admin exists
    const admin = await Admin.findOne({ role: "admin" }).select("content");

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.status(200).json({
      success: true,
      count: admin.content.length,
      content: admin.content,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// approve the admin

exports.approveMedia = async (req, res) => {
  try {
    const { mediaId } = req.params;

    const admin = await Admin.findOne(); // single admin
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const media = admin.content.id(mediaId);
    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    media.status = "approved";
    await admin.save();

    res.json({
      success: true,
      message: "Media approved",
      media,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


// delete the media 
exports.deleteAdminMedia = async (req, res) => {
  try {
    const { mediaId } = req.params;

    // Find the admin who owns this media (if multiple admins, you can use req.admin.id)
    const admin = await Admin.findOne({ "content._id": mediaId });
    if (!admin) return res.status(404).json({ error: "Media not found" });

    // Remove the media from the content array
    admin.content = admin.content.filter((item) => item._id.toString() !== mediaId);
    await admin.save();

    res.status(200).json({ message: "Media deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete media" });
  }
};


// Update admin media info
exports.updateAdminMedia = async (req, res) => {
  const { mediaId } = req.params;
  const { title, description, severity } = req.body;

  if (!title || !severity) {
    return res.status(400).json({ error: "Title and severity are required" });
  }

  try {
    const admin = await Admin.findOne({ "content._id": mediaId });

    if (!admin) return res.status(404).json({ error: "Media not found" });

    // Find the media in content array
    const media = admin.content.id(mediaId);
    media.title = title;
    media.description = description;
    media.severity = severity.toLowerCase();

    await admin.save();

    res.json({ message: "Media updated successfully", content: media });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
