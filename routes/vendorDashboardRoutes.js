const express = require("express");
const router = express.Router();
const { getVendorProfile, getMyProducts, getVendorQuotes, getVendorInquiries } = require("../controllers/vendorDashboardController");
const { servicesOffered, businessHours, projectsCompleted, gallery, ratings } = require("../controllers/vendorProfileController");

router.get('/',getVendorProfile);
router.get('/my-products', getMyProducts);
router.get('/quotes', getVendorQuotes);
router.get('/inquiries', getVendorInquiries);
router.get('/services', servicesOffered);
router.get('/business-hours', businessHours);
router.get('/projects', projectsCompleted);
router.get('/gallery', gallery);
router.get('/ratings', ratings);

module.exports = router;