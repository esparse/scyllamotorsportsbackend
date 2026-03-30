const Vendor = require("../models/Vendor");

// get vendor data
const getVendorProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "User not found" });

    let vendorProfile = null;
    let vendorId = null;

    if (req.user.role === "VENDOR") {
      vendorProfile = await Vendor.findById(req.user._id).lean();
      vendorId = vendorProfile._id;
    }
    const mediaUrls = (vendorProfile.media || []).map(
      (file) => `${req.protocol}://${req.get("host")}/${file}`
    );

    if (!vendorProfile) return res.status(404).json({ error: "Vendor not found" });

    
    

    res.json({
      ...vendorProfile,
      media: mediaUrls,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }

}
// give count of all vendor
const getMyProducts = async (req, res) => {
  try {
    // Count how many products this vendor has uploaded
    const productCount = await Product.countDocuments({
      createdBy: req.user.id,
      creatorModel: "Vendor"
    });

    res.json({ productCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getVendorQuotes = async (req, res) => {
  const vendorId = req.user.id;

  const quotes = await Quote.find({ vendor: vendorId })
    .populate("product")
    .sort({ createdAt: -1 });

  res.json(quotes);
};

const getVendorInquiries = async (req, res) => {
  const vendorId = req.user.id; // logged-in vendor

  const inquiries = await Inquiry.find({ vendor: vendorId })
    .populate("product")
    .sort({ createdAt: -1 });

  res.json(inquiries);
};

module.exports = {
  getVendorProfile,
  getMyProducts,
  getVendorQuotes,
  getVendorInquiries,
}