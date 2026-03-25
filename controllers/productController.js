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

    // validation
    if (!title || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image required"
      });
    }

    // upload images
    const imageUrls = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "products"
      });

      imageUrls.push(result.secure_url);

      // remove temp file
      fs.unlinkSync(file.path);
    }

    // create product
    
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

      // connection with Vendor/Team
      createdBy: req.user._id,
      creatorModel: req.user.role === "vendor" ? "Vendor" : "Team"
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product
    });

  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// View own products
// product.controller.js


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