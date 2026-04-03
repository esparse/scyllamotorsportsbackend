const express = require("express");
const router = express.Router();
const teamController = require("../controllers/teamController");
const vehicleController = require("../controllers/vehicleController");
const memberController = require("../controllers/memberController");
const { getTeamActivities } = require("../controllers/activity.controller");
const auth = require("../middlewares/authUser");
const { upload, handleUploadError } = require("../middlewares/upload");
const dashboardController = require("../controllers/teamDashboardController");

// ─────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────
router.post(
  "/register",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "verificationDoc", maxCount: 1 },
  ]),
  handleUploadError,
  teamController.registerTeam
);

router.post("/login", teamController.loginTeam);

router.get("/all", teamController.getAllApprovedTeams);

// ─────────────────────────────────────────
// PROFILE ROUTES
// ─────────────────────────────────────────
router.get(
  "/profile",
  auth(["TEAM_ADMIN", "MEMBER"]),
  teamController.getTeamProfile
);

router.put(
  "/profile",
  auth(["TEAM_ADMIN"]),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "verificationDoc", maxCount: 1 },
  ]),
  handleUploadError,
  teamController.updateTeamProfile
);

// ─────────────────────────────────────────
// ACTIVITIES ROUTES
// ─────────────────────────────────────────
router.get(
  "/activities",
  auth(["TEAM_ADMIN", "MEMBER"]),
  getTeamActivities
);

// ─────────────────────────────────────────
// SPONSOR ROUTES
// ─────────────────────────────────────────
router.post(
  "/sponsors",
  auth(["TEAM_ADMIN"]),
  upload.single("logo"),
  handleUploadError,
  dashboardController.uploadSponsorLogo
);

router.delete(
  "/sponsors/:id",
  auth(["TEAM_ADMIN"]),
  dashboardController.deleteSponsor
);

// ─────────────────────────────────────────
// GALLERY ROUTES
// ─────────────────────────────────────────
router.post(
  "/gallery",
  auth(["TEAM_ADMIN"]),
  upload.array("gallery", 10),
  handleUploadError,
  teamController.uploadGallery
);

router.delete(
  "/gallery",
  auth(["TEAM_ADMIN"]),
  teamController.deleteGalleryMedia
);

// ─────────────────────────────────────────
// SOCIAL LINKS ROUTES
// ─────────────────────────────────────────
router.post(
  "/social-links",
  auth(["TEAM_ADMIN"]),
  teamController.addSocialLink
);

router.delete(
  "/social-links/:id",
  auth(["TEAM_ADMIN"]),
  teamController.deleteSocialLink
);

// ─────────────────────────────────────────
// MEMBER ROUTES
// ─────────────────────────────────────────

// NOTE: /members/certificates/me and /members/certificates
// must be before /members/:id to avoid route conflict
router.get(
  "/members/certificates/me",
  auth(["TEAM_ADMIN", "MEMBER"]),
  memberController.getMyCertificates
);

router.post(
  "/members/certificates",
  auth(["TEAM_ADMIN", "MEMBER"]),
  upload.single("file"),
  handleUploadError,
  memberController.uploadCertificate
);

router.post(
  "/members/set-password/:token",
  memberController.setMemberPassword
);

router.post(
  "/members",
  auth(["TEAM_ADMIN"]),
  memberController.addMember
);

router.get(
  "/members",
  auth(["TEAM_ADMIN", "MEMBER"]),
  memberController.getMembers
);

router.get(
  "/members/:id",
  auth(["TEAM_ADMIN", "MEMBER"]),
  memberController.getMember
);

router.put(
  "/members/:id",
  auth(["TEAM_ADMIN"]),
  memberController.updateMember
);

router.delete(
  "/members/:id",
  auth(["TEAM_ADMIN"]),
  memberController.deleteMember
);

// ─────────────────────────────────────────
// VEHICLE ROUTES
// ─────────────────────────────────────────
router.post(
  "/vehicles",
  auth(["TEAM_ADMIN"]),
  upload.single("image"),
  handleUploadError,
  vehicleController.addVehicle
);

router.get(
  "/vehicles",
  auth(["TEAM_ADMIN", "MEMBER"]),
  vehicleController.getVehicles
);

router.delete(
  "/vehicles/:id",
  auth(["TEAM_ADMIN"]),
  vehicleController.removeVehicle
);



// ─────────────────────────────────────────
// DASHBOARD ROUTES
// ─────────────────────────────────────────
router.get("/dashboard/profile",          auth(["TEAM_ADMIN", "MEMBER"]), dashboardController.getTeamProfile);
router.get("/dashboard/vehicles/count",   auth(["TEAM_ADMIN", "MEMBER"]), dashboardController.getVehicleCount);
router.get("/dashboard/events",           auth(["TEAM_ADMIN", "MEMBER"]), dashboardController.eventsParticipated);
router.get("/dashboard/members",          auth(["TEAM_ADMIN", "MEMBER"]), dashboardController.getMembers);
router.delete("/dashboard/members/:memberId",  auth(["TEAM_ADMIN"]),      dashboardController.removeMember);
// router.get("/dashboard/members/:memberId/certificates",        auth(["TEAM_ADMIN"]), memberController.getMemberCertificates);
// router.patch("/dashboard/members/:memberId/certificates/:certificateId/verify", auth(["TEAM_ADMIN"]), memberController.verifyCertificate);

module.exports = router;