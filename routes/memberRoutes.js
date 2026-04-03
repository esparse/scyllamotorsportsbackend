const express = require("express");
const router = express.Router();
const memberController = require("../controllers/memberController");
const auth = require("../middlewares/authUser"); 
const teamController = require("../controllers/teamController");

const { upload, handleUploadError } = require("../middlewares/upload");

// single file
router.post(
  "/certificates",
  auth(["TEAM_ADMIN", "MEMBER"]),
  upload.single("file"),
  handleUploadError,
  memberController.uploadCertificate,
);

// if you ever need multiple files (e.g. gallery)
router.post(
  "/gallery",
  auth(["TEAM_ADMIN"]),
  upload.array("files", 5),
  handleUploadError,
  teamController.uploadGallery,
);

router.post("/set-password/:token", memberController.setMemberPassword);

router.post("/", auth(["TEAM_ADMIN"]), memberController.addMember);
router.get("/", auth(["TEAM_ADMIN", "MEMBER"]), memberController.getMembers);
router.get("/:id", auth(["TEAM_ADMIN", "MEMBER"]), memberController.getMember);
router.put("/:id", auth(["TEAM_ADMIN"]), memberController.updateMember);
router.delete("/:id", auth(["TEAM_ADMIN"]), memberController.deleteMember);

module.exports = router;
