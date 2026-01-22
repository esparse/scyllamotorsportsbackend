const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin"], default: "admin" },
    content: [
      {
        fileUrl: { type: String, required: true },
        fileType: {
          type: String,
          enum: ["image", "video"],
          required: true,
        },
        title: { type: String, required: true },
        description: { type: String },
        severity: {
          type: String,
          enum: ["low", "medium", "high"],
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "approved"],
          default: "pending",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
    
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
