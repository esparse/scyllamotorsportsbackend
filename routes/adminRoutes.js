const express = require("express");
const router = express.Router();

const authUser = require("../middlewares/authUser");
const adminAuth = require("../middlewares/adminAuth");
const adminCtrl = require("../controllers/adminController");
const { getAdminDashboardStats } = require("../controllers/adminDashboardController");




// Admin Login 
router.post("/login", adminCtrl.adminLogin);

router.get("/",adminAuth, adminCtrl.getAdminProfile);

router.put("/update",adminAuth, adminCtrl.updateAdmin);

// Pending Users (Teams + Vendors) 
// router.get("/pending", adminAuth, adminCtrl.getPendingUsers);
router.get("/pending",adminAuth, adminCtrl.getPendingUsers);

// Approve / Reject Teams 
// router.put("/team/:id/approve", adminAuth, adminCtrl.approveTeam);
router.put("/team/:id/approve",adminAuth, adminCtrl.approveTeam);
// router.put("/team/:id/reject", adminAuth, adminCtrl.rejectTeam);
router.put("/team/:id/reject",adminAuth, adminCtrl.rejectTeam);

// Approve Vendors 
// router.put("/vendor/:id/approve", adminAuth, adminCtrl.approveVendor);
router.put("/vendor/:id/approve", adminCtrl.approveVendor);
// reject vendor
// router.put("/vendor/:id/reject", adminAuth,adminCtrl.rejectVendor);
router.put("/vendor/:id/reject", adminCtrl.rejectVendor);

//Pending Products
// router.get("/products/pending", adminAuth, adminCtrl.getPendingProducts);
router.get("/products/pending",adminAuth, adminCtrl.getPendingProducts);
// router.put("/products/:id/approve", adminAuth, adminCtrl.approveProduct);
router.put("/products/:id/approve", adminCtrl.approveProduct);
// router.put("/products/:id/reject", adminAuth, adminCtrl.rejectProduct);
router.put("/products/:id/reject", adminCtrl.rejectProduct);

// Admin Dashboard
// router.get("/dashboard", authUser(["admin"]), getAdminDashboardStats);
router.get("/dashboard",adminAuth, getAdminDashboardStats);


// verification docs
router.get("/verification",adminAuth,adminCtrl.fetchVerificationDoc);


router.patch(
  "/verification/:ownerType/:id",
  adminCtrl.updateVerificationStatus
);

// content moderation
// add content moderation
router.post("/content", adminCtrl.upload,adminCtrl.saveAdminContent);

// fetch content moderation
router.get("/content",adminCtrl.getAdminContent);


// approve the media at admin level
router.patch("/media/:mediaId/approve",adminCtrl.approveMedia);

// delete the media
router.delete("/media/:mediaId",adminCtrl.deleteAdminMedia);

// update the media
router.put("/media/:mediaId", adminCtrl.updateAdminMedia);



module.exports = router;
