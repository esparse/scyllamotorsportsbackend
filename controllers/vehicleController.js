const Vehicle = require("../models/Vehicle");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const logTeamActivity = require("../utils/activityLogger");

// Multer config: temporary local storage
const upload = multer({ dest: "uploads/" });

const uploadMiddleware = upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "thumbnails", maxCount: 4 },
]);

const addVehicle = async (req, res) => {
  try {
    const { teamId } = req;
    const { name, type, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Name and type are required" });
    }

    let vehicle = new Vehicle({
      team: teamId,
      name,
      type,
      description,
    });

    let newVehicle = await vehicle.save();

    // Main image
    if (req.files["mainImage"]?.[0]) {
      const file = req.files["mainImage"][0];

      const result = await cloudinary.uploader.upload(file.path, {
        folder: `teams/${teamId}/vehicles/${newVehicle._id}`,
      });

      newVehicle.mainImage = result.secure_url;
      fs.unlink(file.path, () => {});
    }

    // Thumbnails
    if (req.files["thumbnails"]) {
      const urls = [];

      for (const file of req.files["thumbnails"]) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: `teams/${teamId}/vehicles/${newVehicle._id}`,
        });

        urls.push(result.secure_url);
        fs.unlink(file.path, () => {});
      }

      newVehicle.thumbnails = urls;
    }

    await newVehicle.save();

    await logTeamActivity(teamId, `Vehicle ${name} added`);

    res.status(201).json({
      message: "Vehicle added successfully",
      vehicle: newVehicle,
    });

  } catch (error) {
    console.error("Error adding vehicle:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const removeVehicle = async (req, res) => {
  try {
    const { teamId } = req;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid vehicle ID" });
    }

    const vehicle = await Vehicle.findOneAndDelete({
      _id: id,
      team: teamId,
    });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    await logTeamActivity(teamId, `Vehicle ${vehicle.name} removed`);

    res.status(200).json({ message: "Vehicle removed successfully" });

  } catch (error) {
    console.error("Error removing vehicle:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getVehicles = async (req, res) => {
  try {
    const { teamId } = req; // From teamAuth middleware
    const vehicles = await Vehicle.find({ team: teamId });
    res.status(200).json({ vehicles });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ message: "Server error" });
  } 
};

module.exports = {
  addVehicle,
  removeVehicle,
  getVehicles,
  uploadMiddleware,
};