const Admin = require("../models/Admin");

// Get all approved content for landing page
exports.getLandingContent = async (req, res) => {
  try {
    // Fetch all admins with content
    const admins = await Admin.find(
      { "content.status": "approved" }, // at least one approved content
      { content: 1, _id: 0 } // only content field
    );

    // Flatten and filter content by approved status
    const approvedContent = admins
      .map(admin => admin.content.filter(c => c.status === "approved"))
      .flat();

    // Sort latest first (optional)
    approvedContent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: approvedContent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
