const productModel = require("../models/Product");

// public marketplace controller
const getApprovedProducts = async (req, res) => {
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


// Sort by product by date added
const getAllProductsSortedByDate = async (req, res) => {
  try {
    const { page = 1, limit = 6 } = req.query;
    const products = await productModel
      .find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get specfic vendor products for marketplace

const getVendorSpecificProducts = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    const { page = 1, limit = 6 } = req.query;
    const products = await productModel
      .find({ vendor: vendorId })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  getApprovedProducts,
  getVendorSpecificProducts,
  getAllProductsSortedByDate,
  
};