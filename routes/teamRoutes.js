const express = require("express");
const router = express.Router();
const teamCtrl = require("../controllers/teamController");
// import { getTeamActivities } from "../controllers/activity.controller.js";
const teamAuth = require("../middlewares/teamAuth");
const { getTeamActivities } = require("../controllers/activity.controller");
const { uploadGalleryMiddleware } = require("../controllers/teamController")
const authUser = require("../middlewares/authUser")

const multer = require("multer");

// Temp storage for uploads
const upload = multer({ dest: "uploads/" });

// Register & login routes
router.post("/register", upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "verificationDoc", maxCount: 1 }
]), teamCtrl.registerTeam);

router.post("/login", teamCtrl.loginTeam);

// Profile routes (get & update)
router.get("/profile", authUser(["TEAM_ADMIN", "MEMBER"]), teamCtrl.getTeamProfile);

router.put("/profile", teamAuth, upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "verificationDoc", maxCount: 1 }
]), teamCtrl.updateTeamProfile);


router.get("/activities", authUser(["TEAM_ADMIN", "MEMBER"]), getTeamActivities);

// POST /team/profile/media
router.post("/profile/media", teamAuth, upload.single("media"), teamCtrl.uploadTeamMedia);

// DELETE /api/teams/profile/media/:filename
// router.delete('/profile/media/:filename', teamAuth, teamCtrl.deleteTeamMedia);

// add achivements
router.post("/profile/achievements",teamAuth, teamCtrl.addAchievement);

// delete achivement
router.delete("/profile/achievements/:id",teamAuth, teamCtrl.deleteAchievement);

// upload sponser logo
router.post("/profile/sponsor", teamAuth, teamCtrl.uploadSponsorLogo);

// delete sponsor
router.delete(
  "/profile/sponsor/:id",
  teamAuth,
  teamCtrl.deleteSponsor
);



// upload media gallary
router.post(
  "/profile/gallery",
  teamAuth,
  uploadGalleryMiddleware , // 👈 REQUIRED
  teamCtrl.uploadGallery
);

router.delete("/profile/gallery", teamAuth, teamCtrl.deleteGalleryMedia);


router.get("/", teamCtrl.getAllTeams);
// router.get("/:teamId", teamCtrl.getPublicTeamProfile);


// ADD social link
router.post("/social", teamAuth, teamCtrl.addSocialLink);

// DELETE social link
router.delete("/social/:id", teamAuth, teamCtrl.deleteSocialLink);

// router.get("/social", teamAuth, teamCtrl.getSocialLinks);

module.exports = router;
