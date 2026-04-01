const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");
const authUser = require("../middlewares/authUser")
const multer = require("multer");
const {getVendorSpecificProducts} = require("../controllers/MarketplaceController");
const productCtrl = require("../controllers/productController");
const {getMyProducts} = require("../controllers/vendorDashboardController");
const {getVendorProfile} = require("../controllers/vendorDashboardController")
const {getAllVendors} = require("../controllers/adminController")

// Temp storage for uploads
const upload = multer({ dest: "uploads/" });


// vendor registeration
router.post(
  "/register",
  vendorController.uploadVendorFiles,
  vendorController.registerVendor
);

// vendor login
router.post("/login", vendorController.loginVendor);

//get vendor data)
router.get("/profile",authUser(["VENDOR"]),getVendorProfile);

// edit vendor profile
router.put("/profile", authUser(["VENDOR"]), upload.fields([
  { name: "logo", maxCount: 1 },
  {name: "banner", maxCount: 1},
  { name: "verificationDoc", maxCount: 1 }
]),vendorController.editVendorProfile);

// upload business hour
router.put(
  "/businessHours",
  authUser(["VENDOR"]), // your vendor auth middleware
  vendorController.updateBusinessHours ,

);


// upload vendor gallery
router.post(
  "/profile/gallery",
  authUser(["VENDOR"]),
  vendorController.uploadGalleryMiddleware , // 👈 REQUIRED
  vendorController.uploadGallery
);

router.get("/", getAllVendors);
router.get("/:vendorId", vendorController.getPublicVendorProfile);


// upload media
router.post("/profile/media", authUser(["VENDOR"]), upload.single("media"), vendorController.uploadVendorMedia);

router.post("/service", authUser(["VENDOR"]), vendorController.addVendorService);

router.post(
  "/project",
  authUser(["VENDOR"]),
  upload.single("image"),
  vendorController.addProject
);


router.get("/my", authUser(["VENDOR", "TEAM_ADMIN"]), getMyProducts);

// for product/servicing tab in vendor profile
router.get("/products/:vendorId", getVendorSpecificProducts);

module.exports = router;
