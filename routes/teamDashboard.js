const express = require("express");
const router = express.Router();
const { getTeamProfile } = require("../controllers/teamController");

router.get('/',getTeamProfile);

module.exports = router;