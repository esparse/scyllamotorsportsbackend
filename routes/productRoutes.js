const express = require("express");
const router = express.Router();
const productCtrl = require("../controllers/productController");
const authUser = require("../middlewares/authUser");
const {
  approveProduct,
  rejectProduct,
} = require("../controllers/adminController");

// Vendor / Team
router.post(
  "/",
  authUser(["VENDOR", "TEAM_ADMIN"]),
  productCtrl.uploadProductImages,
  productCtrl.createProduct
);

router.get("/my", authUser(["VENDOR", "TEAM_ADMIN"]), productCtrl.getMyProducts);


router.get("/filters",productCtrl.getMarketplaceFilters)

// Public marketplace
router.get("/marketplace", productCtrl.getApprovedProducts);

// Admin
router.put("/:id/approve", authUser(["admin"]), approveProduct);
router.put("/:id/reject", authUser(["admin"]), rejectProduct);

module.exports = router;
