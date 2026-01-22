const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  name: { type: String, required: true },
  role: { type: String, required: true }, // Driver, Engineer, Crew, etc.
  bio: String,
  profilePic: String, // Cloudinary URL
  certificates: [
    {
      name: { type: String, required: true },   // ✅ CERTIFICATE NAME
      url: { type: String},    // cloudinary file
      expiryDate: { type: Date}, // ✅ NEW
      uploadedAt: { type: Date, default: Date.now },
    },
  ],


  // 🔐 Login credentials
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
    select: false, // never return password
  },

  roleType: {
    type: String,
    enum: ["MEMBER"],
    default: "MEMBER",
  },

  // 🔑 Password setup flow
  passwordSetupToken: String,
  passwordSetupExpires: Date,

  // ⚙️ Status
  isActive: {
    type: Boolean,
    default: false,
  },

  phone: {
    type: String, defualt: "",
  },

  location: { type: String, default: "" },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Member", memberSchema);
