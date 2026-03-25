const express = require("express");
const router = express.Router();
exports.router = router;
const productCtrl = require("../controllers/productController");
const authUser = require("../middlewares/authUser");
const {approveProduct,rejectProduct  } = require("../controllers/adminController");

// Vendor / Team
router.post(
  "/",
  authUser(["VENDOR", "TEAM_ADMIN"]),
  productCtrl.uploadProductImages,
  productCtrl.createProduct
);



router.get("/filters",productCtrl.getMarketplaceFilters)




module.exports = router;
