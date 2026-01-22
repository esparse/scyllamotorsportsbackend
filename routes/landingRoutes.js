const express = require("express");
const router = express.Router();
const landingController = require("../controllers/landingController");

// Public landing page content route
router.get("/content", landingController.getLandingContent);

module.exports = router;
