const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    participants: [
      {
        team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
        driver: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },

        status: {
          type: String,
          enum: ["registered", "approved", "rejected"],
          default: "registered",
        },

        position: Number,
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Event", eventSchema);
