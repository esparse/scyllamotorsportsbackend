const Vendor = require("../models/Vendor");
const Review = require("../models/Review");
const mongoose = require("mongoose");

const servicesOffered = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json({ services: vendor.services });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const businessHours = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json({ businessHours: vendor.businessHours });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const projectsCompleted = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json({ projects: vendor.projects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const gallery = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json({ gallery: vendor.gallery });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const ratings = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const stats = await Review.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productData",
        },
      },
      { $unwind: "$productData" },
      {
        $match: {
          "productData.createdBy": new mongoose.Types.ObjectId(vendorId),
          "productData.creatorModel": "Vendor",
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          twoStar: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          threeStar: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          fourStar: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          fiveStar: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        },
      },
    ]);

    if (stats.length === 0) {
      return res.json({
        avgRating: 0,
        totalReviews: 0,
        breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    }

    const {
      avgRating,
      totalReviews,
      oneStar,
      twoStar,
      threeStar,
      fourStar,
      fiveStar,
    } = stats[0];

    res.json({
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews,
      breakdown: {
        1: oneStar,
        2: twoStar,
        3: threeStar,
        4: fourStar,
        5: fiveStar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  servicesOffered,
  businessHours,
  projectsCompleted,
  gallery,
  ratings,
};
