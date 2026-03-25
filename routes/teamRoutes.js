const express = require("express");
const router = express.Router();

const multer = require("multer");

// Controllers
const {
  loginTeam,
  registerTeam,
  getTeamProfile,
  updateTeamProfile,
  uploadTeamMedia,
  addAchievement,
  deleteAchievement,
  deleteSponsor,
  uploadGallery,
  deleteGalleryMedia,
  getAllTeams,
  addSocialLink,
  deleteSocialLink,
  addMember,
  removeMember,
  uploadGalleryMiddleware,
} = require("../controllers/teamController");

const {
  addVehicle,
  getVehicles,
  removeVehicle,
  uploadMiddleware,
} = require("../controllers/vehicleController");

const { getTeamActivities } = require("../controllers/activity.controller");

// Middlewares
const teamAuth = require("../middlewares/teamAuth");
const authUser = require("../middlewares/authUser");

// Multer (for team-related uploads)
const upload = multer({ dest: "uploads/" });

/* ================= AUTH ================= */
router.post(
  "/register",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "verificationDoc", maxCount: 1 },
  ]),
  registerTeam
);

router.post("/login", loginTeam);

/* ================= PROFILE ================= */
router.get("/profile", authUser(["TEAM_ADMIN", "MEMBER"]), getTeamProfile);

router.put(
  "/profile",
  teamAuth,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "verificationDoc", maxCount: 1 },
  ]),
  updateTeamProfile
);

/* ================= ACTIVITIES ================= */
router.get(
  "/activities",
  authUser(["TEAM_ADMIN", "MEMBER"]),
  getTeamActivities
);

/* ================= PROFILE MEDIA ================= */
router.post(
  "/profile/media",
  teamAuth,
  upload.single("media"),
  uploadTeamMedia
);

/* ================= ACHIEVEMENTS ================= */
router.post("/profile/achievements", teamAuth, addAchievement);

router.delete(
  "/profile/achievements/:id",
  teamAuth,
  deleteAchievement
);

/* ================= SPONSORS ================= */
router.delete("/profile/sponsor/:id", teamAuth, deleteSponsor);

/* ================= GALLERY ================= */
router.post(
  "/profile/gallery",
  teamAuth,
  uploadGalleryMiddleware,
  uploadGallery
);

router.delete("/profile/gallery", teamAuth, deleteGalleryMedia);

/* ================= TEAMS ================= */
router.get("/", getAllTeams);

/* ================= SOCIAL LINKS ================= */
router.post("/social", teamAuth, addSocialLink);
router.delete("/social/:id", teamAuth, deleteSocialLink);

/* ================= MEMBERS ================= */
router.post("/members", teamAuth, addMember);
router.delete("/members/:id", teamAuth, removeMember);

/* ================= VEHICLES ================= */
router.post("/vehicles", teamAuth, uploadMiddleware, addVehicle);
router.get("/vehicles", teamAuth, getVehicles);
router.delete("/vehicles/:id", teamAuth, removeVehicle);



module.exports = router;