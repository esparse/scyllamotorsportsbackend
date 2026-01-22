const Team = require("../models/Team");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");

exports.getAdminDashboardStats = async (req, res) => {
  try {
    const [
      totalTeams,
      pendingTeams,
      totalVendors,
      pendingVendors,
      totalProducts,
      pendingProducts,
      approvedProducts
    ] = await Promise.all([
      Team.countDocuments(),
      Team.countDocuments({ status: "pending" }),
      Vendor.countDocuments(),
      Vendor.countDocuments({ status: "pending" }),
      Product.countDocuments(),
      Product.countDocuments({ status: "pending" }),
      Product.countDocuments({ status: "approved" })
    ]);

    res.json({
      teams: { total: totalTeams, pending: pendingTeams },
      vendors: { total: totalVendors, pending: pendingVendors },
      products: {
        total: totalProducts,
        pending: pendingProducts,
        approved: approvedProducts
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Dashboard fetch failed" });
  }
};
