const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  category: {
    type: String,
    required: true
  },

  brand: {
    type: String
  },

  model: {
    type: String
  },

  year: {
    type: Number
  },

  condition: {
    type: String,
    enum: ["new", "used", "refurbished"],
    default: "new"
  },

  images: {
    type: [String],
    required: true
  },

  tags: {
    type: [String],
    default: []
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "creatorModel",
    required: true
  },

  creatorModel: {
    type: String,
    enum: ["Vendor", "Team"],
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "approved"
  }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
