const mongoose = require("mongoose");

const performanceSchema = new mongoose.Schema({
  label: String,
  value: String,
});

const vehicleSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },

  name: { type: String, required: true },
  model: { type: String, required: true },

  mainImage: { type: String, required: true },
  thumbnails: [{ type: String }],

  performance: [performanceSchema],

  technicalSheetPdf: { type: String },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
