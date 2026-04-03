const express = require("express");
const router = express.Router();

const vendorController = require("../controllers/vendorController");
const authUser = require("../middlewares/authUser");
const multer = require("multer");

const {
  getVendorProfile,
  getMyProducts,
} = require("../controllers/vendorDashboardController");

const {
  getVendorSpecificProducts,
} = require("../controllers/MarketplaceController");

// Upload
const upload = multer({ dest: "uploads/" });

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
router.post(
  "/register",
  vendorController.uploadVendorFiles,
  vendorController.registerVendor,
);
router.post("/login", vendorController.loginVendor);

// ─────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────
router.get("/profile", authUser(["VENDOR"]), getVendorProfile);

router.put(
  "/profile",
  authUser(["VENDOR"]),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "verificationDoc", maxCount: 1 },
  ]),
  vendorController.editVendorProfile,
);

// ─────────────────────────────────────────
// BUSINESS SETTINGS
// ─────────────────────────────────────────
router.put(
  "/business-hours",
  authUser(["VENDOR"]),
  vendorController.updateBusinessHours,
);

// ─────────────────────────────────────────
// MEDIA & GALLERY
// ─────────────────────────────────────────
router.post(
  "/gallery",
  authUser(["VENDOR"]),
  vendorController.uploadGalleryMiddleware,
  vendorController.uploadGallery,
);

router.post(
  "/media",
  authUser(["VENDOR"]),
  upload.single("media"),
  vendorController.uploadVendorMedia,
);

// ─────────────────────────────────────────
// SERVICES & PROJECTS
// ─────────────────────────────────────────
router.post(
  "/services",
  authUser(["VENDOR"]),
  vendorController.addVendorService,
);

router.post(
  "/projects",
  authUser(["VENDOR"]),
  upload.single("image"),
  vendorController.addProject,
);

// ─────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────
router.get("/me/products", authUser(["VENDOR", "TEAM_ADMIN"]), getMyProducts);

// public vendor products
router.get("/products/:vendorId", getVendorSpecificProducts);

// ─────────────────────────────────────────
// PUBLIC PROFILE
// ─────────────────────────────────────────
router.get("/:vendorId", vendorController.getPublicVendorProfile);

module.exports = router;
