const Vehicle = require("../models/Vehicle");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const logTeamActivity = require("../utils/activityLogger");


// Multer config: temporary local storage
const upload = multer({ dest: "uploads/" });

exports.uploadMiddleware = upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "thumbnails", maxCount: 4 }
]);


// Add Vehicle
// exports.addVehicle = async (req, res) => {
//   try {
//     // const { name, model, year } = req.body;
//     const body = req.body || {};
//     const { name, model, year } = body;

//     // const files = req.files;
//     const files = Array.isArray(req.files) ? req.files : [];

//     const imageUrls = [];

//     // Upload each file to Cloudinary
//     for (const file of files) {
//       const result = await cloudinary.uploader.upload(file.path, {
//         folder: "motorsport-vehicles"
//       });
//       imageUrls.push(result.secure_url);

//       // Delete temp file
//       fs.unlinkSync(file.path);
//     }

//     const vehicle = new Vehicle({ name, model, year, images: imageUrls });
//     await vehicle.save();
//     res.json({ success: true, vehicle });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
exports.addVehicle = async (req, res) => {
  try {
    const { name, model, performance, technicalSheetPdf } = req.body;

    if (!req.team) {
      return res.status(401).json({ error: "Team not found" });
    }

    /* ---------------- MAIN IMAGE ---------------- */
    if (!req.files?.mainImage?.[0]) {
      return res.status(400).json({ error: "Main image is required" });
    }

    const mainImageUpload = await cloudinary.uploader.upload(
      req.files.mainImage[0].path,
      { folder: "motorsport-vehicles/main" }
    );

    fs.unlinkSync(req.files.mainImage[0].path);

    /* ---------------- THUMBNAILS ---------------- */
    const thumbnailUrls = [];

    if (req.files.thumbnails) {
      for (const file of req.files.thumbnails) {
        const upload = await cloudinary.uploader.upload(file.path, {
          folder: "motorsport-vehicles/thumbnails"
        });
        thumbnailUrls.push(upload.secure_url);
        fs.unlinkSync(file.path);
      }
    }

    /* ---------------- PERFORMANCE ---------------- */
    let parsedPerformance = [];
    if (performance) {
      parsedPerformance = JSON.parse(performance);
    }

    /* ---------------- SAVE VEHICLE ---------------- */
    const vehicle = new Vehicle({
      team: req.team._id,
      name,
      model,
      mainImage: mainImageUpload.secure_url,
      thumbnails: thumbnailUrls,
      performance: parsedPerformance,
      technicalSheetPdf
    });

    await vehicle.save();

    await logTeamActivity(
      req.team._id,
      "VEHICLE_ADDED",
      "Vehicle added",
      `${vehicle.name} added to garage`
    );

    res.status(201).json({ success: true, vehicle });

  } catch (err) {
    console.error("Add vehicle error:", err);
    res.status(500).json({ error: err.message });
  }
};



// Get Vehicles

// exports.getVehicles = async (req, res) => {
//   const vehicles = await Vehicle.find({ team: req.team._id });
//   res.json({ success: true, vehicles });
// };

// Delete Vehicle

// exports.getVehicles = async (req, res) => {
//   try {
//     if (!req.user) return res.status(401).json({ error: "User not found" });

//     let teamId = null;

//     if (req.user.role === "TEAM_ADMIN") {
//       teamId = req.user._id;        // TEAM_ADMIN → their own team
//     } else if (req.user.role === "MEMBER") {
//       teamId = req.user.team;       // MEMBER → the team they belong to
//     }

//     if (!teamId) return res.status(400).json({ error: "Team ID not found" });

//     const vehicles = await Vehicle.find({ team: teamId }).lean();

//     res.json({ success: true, vehicles });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// };



exports.getVehicles = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not found" });
    }

    const teamId =
      req.user.role === "TEAM_ADMIN" ? req.user._id : req.user.team;

    if (!teamId) {
      return res.status(400).json({ error: "Team ID not found" });
    }

    const vehicles = await Vehicle.find({ team: teamId }).lean();

    res.json({
      success: true,
      vehicles: vehicles.map(v => ({
        ...v,
        thumbnails: v.thumbnails || [],
        performance: v.performance || []
      }))
    });

  } catch (err) {
    console.error("Get vehicles error:", err);
    res.status(500).json({ error: "Server error" });
  }
};




exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    await Vehicle.findByIdAndDelete(req.params.id);

    await logTeamActivity(
      req.team._id,
      "VEHICLE_REMOVED",
      "Vehicle removed",
      "A vehicle was removed from garage"
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};