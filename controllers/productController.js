const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const fs = require("fs");

const upload = multer({ dest: "uploads/" });

exports.uploadProductImages = upload.array("images", 5);

// Create Product
exports.createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      brand,
      model,
      year,
      condition,
      tags
    } = req.body;

    if (!title || !description || !price || !category) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one image required" });
    }

    // Upload images to Cloudinary
    const imageUrls = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "products"
      });

      imageUrls.push(result.secure_url);
      fs.unlinkSync(file.path);
    }

    const product = await Product.create({
      title,
      description,
      price,
      category,
      brand,
      model,
      year,
      condition,
      tags: tags ? JSON.parse(tags) : [],
      images: imageUrls,

      createdBy: req.user._id,
      creatorModel: req.user.role === "VENDOR" ? "Vendor" : "Team"

    });

    console.log("ROLE:", req.user.role);


    res.status(201).json({
      success: true,
      message: "Product submitted for approval",
      data: product
    });

  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// View own products
// product.controller.js
exports.getMyProducts = async (req, res) => {
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

// admin
exports.approveProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.status = "approved";
    await product.save();

    res.json({ message: "Product approved successfully", product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// admin
exports.rejectProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.status = "rejected";
    await product.save();

    res.json({ message: "Product rejected", product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getApprovedProducts = async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const products = await Product.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .lean();

    console.log("Fetched products:", products.length);

    const formattedProducts = products.map(p => ({
      _id: p._id,
      name: p.title,
      category: p.category,
      description: p.description,
      price: p.price,
      image: p.images?.[0] || "",
      condition: p.condition || "new",
      tags: p.tags || []
    }));

    res.status(200).json({
      success: true,
      data: formattedProducts
    });

  } catch (error) {
    res.status(500).json({ success: false });
  }
};


exports.getMarketplaceFilters = async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    const brands = await Product.distinct("brand");
    const conditions = await Product.distinct("condition");

    const maxPrice = await Product.findOne()
      .sort({ price: -1 })
      .select("price")
      .lean();

    res.json({
      success: true,
      data: {
        categories,
        brands,
        conditions,
        maxPrice: maxPrice?.price || 0
      }
    });
  } catch (err) {
    console.error("Filter meta error:", err);
    res.status(500).json({ success: false, message: "Failed to load filters" });
  }
};