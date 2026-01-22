const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/vehicleController");
const teamAuth = require("../middlewares/teamAuth")
const authUser = require("../middlewares/authUser")

router.post("/",teamAuth, vehicleController.uploadMiddleware, vehicleController.addVehicle);
router.get("/", authUser(["TEAM_ADMIN", "MEMBER"]), vehicleController.getVehicles);
router.delete("/:id",teamAuth, vehicleController.deleteVehicle);

module.exports = router;
