const mongoose = require("mongoose");

const teamActivitySchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true
    },

    type: {
      type: String,
      required: true
      // ex: TEAM_APPROVED, MEMBER_ADDED, VEHICLE_DELETED
    },

    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamActivity", teamActivitySchema);
