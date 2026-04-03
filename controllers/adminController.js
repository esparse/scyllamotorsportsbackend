const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const Admin = require("../models/Admin");
const Team = require("../models/Team");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");
const sendMail = require("../utils/mailer");
const logTeamActivity = require("../utils/activityLogger");

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Admin login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// GET ADMIN PROFILE
// ─────────────────────────────────────────
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password");
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    res.json(admin);
  } catch (err) {
    console.error("Get admin profile error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// UPDATE ADMIN
// ─────────────────────────────────────────
exports.updateAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!updatedAdmin) return res.status(404).json({ error: "Admin not found" });

    res.json({ success: true, message: "Admin updated successfully", admin: updatedAdmin });
  } catch (err) {
    console.error("Update admin error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// GET PENDING USERS (teams + vendors)
// ─────────────────────────────────────────
exports.getPendingUsers = async (req, res) => {
  try {
    const [teams, vendors] = await Promise.all([
      Team.find({ status: "pending" }).lean(),
      Vendor.find({ status: "pending" }).lean(),
    ]);

    res.json({ teams, vendors });
  } catch (err) {
    console.error("Get pending users error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// GET ALL VENDORS
// ─────────────────────────────────────────
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({})
      .select("businessName category logo location status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, vendors });
  } catch (err) {
    console.error("Get all vendors error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// GET ALL TEAMS
// ─────────────────────────────────────────
exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find({})
      .select("name category logo location status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, teams });
  } catch (err) {
    console.error("Get all teams error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// GET PENDING PRODUCTS
// ─────────────────────────────────────────
exports.getPendingProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: "pending" })
      .populate("createdBy", "name businessName")
      .lean();

    res.json({ success: true, products });
  } catch (err) {
    console.error("Get pending products error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// APPROVE TEAM
// ─────────────────────────────────────────
exports.approveTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    team.status = "approved";
    await team.save();

    await logTeamActivity(
      team._id,
      "TEAM_APPROVED",
      "Team approved",
      `Your team "${team.name}" has been approved`
    );

    sendMail({
      to: team.email,
      subject: "Team Approved ✅",
      html: `
        <h2>Hello ${team.name}!</h2>
        <p>Great news! Your team has been <b>approved</b> by the admin.</p>
        <p>You can now log in and access your full dashboard.</p>
        <p>Welcome to the platform!</p>
      `,
    }).catch((err) => console.error("Email error:", err.message));

    res.json({ success: true, message: "Team approved" });
  } catch (err) {
    console.error("Approve team error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// REJECT TEAM
// ─────────────────────────────────────────
exports.rejectTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const { reason } = req.body; // optional rejection reason

    team.status = "rejected";
    await team.save();

    await logTeamActivity(
      team._id,
      "TEAM_REJECTED",
      "Team rejected",
      `Your team "${team.name}" has been rejected`
    );

    sendMail({
      to: team.email,
      subject: "Team Application Rejected ❌",
      html: `
        <h2>Hello ${team.name},</h2>
        <p>Unfortunately, your team application has been <b>rejected</b>.</p>
        ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ""}
        <p>Please contact admin for more details or to reapply.</p>
      `,
    }).catch((err) => console.error("Email error:", err.message));

    res.json({ success: true, message: "Team rejected" });
  } catch (err) {
    console.error("Reject team error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// APPROVE VENDOR
// ─────────────────────────────────────────
exports.approveVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    vendor.status = "approved";
    await vendor.save();

    sendMail({
      to: vendor.email,
      subject: "Vendor Account Approved ✅",
      html: `
        <h2>Hello ${vendor.businessName}!</h2>
        <p>Your vendor account has been <b>approved</b> by the admin.</p>
        <p>You can now log in, list your products, and start selling on the platform.</p>
        <p>Welcome aboard!</p>
      `,
    }).catch((err) => console.error("Email error:", err.message));

    res.json({ success: true, message: "Vendor approved" });
  } catch (err) {
    console.error("Approve vendor error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// REJECT VENDOR
// ─────────────────────────────────────────
exports.rejectVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const { reason } = req.body; // optional rejection reason

    vendor.status = "rejected";
    await vendor.save();

    sendMail({
      to: vendor.email,
      subject: "Vendor Application Rejected ❌",
      html: `
        <h2>Hello ${vendor.businessName},</h2>
        <p>Unfortunately, your vendor application has been <b>rejected</b>.</p>
        ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ""}
        <p>Please contact admin for more details or to reapply.</p>
      `,
    }).catch((err) => console.error("Email error:", err.message));

    res.json({ success: true, message: "Vendor rejected" });
  } catch (err) {
    console.error("Reject vendor error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// APPROVE PRODUCT
// ─────────────────────────────────────────
exports.approveProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.status = "approved";
    await product.save();

    // dynamically find owner — Vendor or Team
    let ownerEmail = null;
    let ownerName = null;

    if (product.creatorModel === "Vendor") {
      const vendor = await Vendor.findById(product.createdBy).select("email businessName").lean();
      if (vendor) {
        ownerEmail = vendor.email;
        ownerName = vendor.businessName;
      }
    } else if (product.creatorModel === "Team") {
      const team = await Team.findById(product.createdBy).select("email name").lean();
      if (team) {
        ownerEmail = team.email;
        ownerName = team.name;
      }
    }

    if (ownerEmail) {
      sendMail({
        to: ownerEmail,
        subject: "Product Approved ✅",
        html: `
          <h2>Hello ${ownerName}!</h2>
          <p>Your product <b>"${product.title}"</b> has been <b>approved</b> by the admin.</p>
          <p>It is now live and visible to customers on the platform.</p>
        `,
      }).catch((err) => console.error("Email error:", err.message));
    }

    res.json({ success: true, message: "Product approved", product });
  } catch (err) {
    console.error("Approve product error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// REJECT PRODUCT
// ─────────────────────────────────────────
exports.rejectProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const { reason } = req.body; // optional rejection reason

    product.status = "rejected";
    await product.save();

    // dynamically find owner — Vendor or Team
    let ownerEmail = null;
    let ownerName = null;

    if (product.creatorModel === "Vendor") {
      const vendor = await Vendor.findById(product.createdBy).select("email businessName").lean();
      if (vendor) {
        ownerEmail = vendor.email;
        ownerName = vendor.businessName;
      }
    } else if (product.creatorModel === "Team") {
      const team = await Team.findById(product.createdBy).select("email name").lean();
      if (team) {
        ownerEmail = team.email;
        ownerName = team.name;
      }
    }

    if (ownerEmail) {
      sendMail({
        to: ownerEmail,
        subject: "Product Rejected ❌",
        html: `
          <h2>Hello ${ownerName},</h2>
          <p>Your product <b>"${product.title}"</b> has been <b>rejected</b>.</p>
          ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ""}
          <p>Please review your product details and resubmit or contact admin for help.</p>
        `,
      }).catch((err) => console.error("Email error:", err.message));
    }

    res.json({ success: true, message: "Product rejected", product });
  } catch (err) {
    console.error("Reject product error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// FETCH VERIFICATION DOCS
// ─────────────────────────────────────────
exports.fetchVerificationDocs = async (req, res) => {
  try {
    const [teams, vendors] = await Promise.all([
      Team.find({}, "name verificationDoc status createdAt").lean(),
      Vendor.find({}, "businessName verificationDoc status createdAt").lean(),
    ]);

    const documents = [
      ...teams.map((team) => ({
        ownerType: "Team",
        ownerId: team._id,
        ownerName: team.name,
        fileUrl: team.verificationDoc,
        status: team.status,
        submittedAt: team.createdAt,
      })),
      ...vendors.map((vendor) => ({
        ownerType: "Vendor",
        ownerId: vendor._id,
        ownerName: vendor.businessName,
        fileUrl: vendor.verificationDoc,
        status: vendor.status,
        submittedAt: vendor.createdAt,
      })),
    ];

    res.json({ success: true, documents });
  } catch (err) {
    console.error("Fetch verification docs error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// UPDATE VERIFICATION STATUS
// ─────────────────────────────────────────
exports.updateVerificationStatus = async (req, res) => {
  try {
    const { ownerType, id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const Model = ownerType === "Team" ? Team : Vendor;

    const owner = await Model.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!owner) return res.status(404).json({ error: "Not found" });

    res.json({ success: true, message: `${ownerType} ${status}`, status: owner.status });
  } catch (err) {
    console.error("Update verification status error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// ADD ADMIN CONTENT
// ─────────────────────────────────────────
exports.saveAdminContent = async (req, res) => {
  try {
    const { title, description, severity } = req.body;

    if (!req.file) return res.status(400).json({ error: "File is required" });

    if (!["low", "medium", "high"].includes(severity)) {
      return res.status(400).json({ error: "Invalid severity. Use low, medium or high" });
    }

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "admin-content",
    });
    fs.unlinkSync(req.file.path);

    const admin = await Admin.findOne({ role: "admin" });
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    admin.content.push({
      fileUrl: uploadResult.secure_url,
      fileType: uploadResult.resource_type === "video" ? "video" : "image",
      title,
      description,
      severity,
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: "Content added successfully",
      content: admin.content[admin.content.length - 1],
    });
  } catch (err) {
    console.error("Save admin content error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// GET ADMIN CONTENT
// ─────────────────────────────────────────
exports.getAdminContent = async (req, res) => {
  try {
    const admin = await Admin.findOne({ role: "admin" }).select("content");
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    res.json({ success: true, count: admin.content.length, content: admin.content });
  } catch (err) {
    console.error("Get admin content error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// APPROVE ADMIN MEDIA
// ─────────────────────────────────────────
exports.approveMedia = async (req, res) => {
  try {
    const admin = await Admin.findOne();
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const media = admin.content.id(req.params.mediaId);
    if (!media) return res.status(404).json({ error: "Media not found" });

    media.status = "approved";
    await admin.save();

    res.json({ success: true, message: "Media approved", media });
  } catch (err) {
    console.error("Approve media error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// UPDATE ADMIN MEDIA
// ─────────────────────────────────────────
exports.updateAdminMedia = async (req, res) => {
  try {
    const { title, description, severity } = req.body;

    if (!title || !severity) {
      return res.status(400).json({ error: "Title and severity are required" });
    }

    const admin = await Admin.findOne({ "content._id": req.params.mediaId });
    if (!admin) return res.status(404).json({ error: "Media not found" });

    const media = admin.content.id(req.params.mediaId);
    media.title = title;
    media.description = description;
    media.severity = severity.toLowerCase();

    await admin.save();

    res.json({ success: true, message: "Media updated", content: media });
  } catch (err) {
    console.error("Update admin media error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─────────────────────────────────────────
// DELETE ADMIN MEDIA
// ─────────────────────────────────────────
exports.deleteAdminMedia = async (req, res) => {
  try {
    const admin = await Admin.findOne({ "content._id": req.params.mediaId });
    if (!admin) return res.status(404).json({ error: "Media not found" });

    admin.content = admin.content.filter(
      (item) => item._id.toString() !== req.params.mediaId
    );
    await admin.save();

    res.json({ success: true, message: "Media deleted" });
  } catch (err) {
    console.error("Delete admin media error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};