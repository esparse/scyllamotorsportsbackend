const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  name: { type: String, required: true },

  role: {
    type: String,
    required: true,
    enum: ["crew", "driver", "engineer", "member", "manager", "designer"],
  },

  bio: String,
  profilePic: String,

  certificates: [
    {
      name: { type: String, required: true },
      url: { type: String },
      expiryDate: { type: Date },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],

  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
    select: false,
  },

  roleType: {
    type: String,
    enum: ["MEMBER"],
    default: "MEMBER",
  },

  passwordSetupToken: String,
  passwordSetupExpires: Date,

  isActive: {
    type: Boolean,
    default: false,
  },

  phone: {
    type: String,
    default: "",
  },

  location: { type: String, default: "" },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Member", memberSchema);