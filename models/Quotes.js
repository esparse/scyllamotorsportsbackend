const mongoose = require("mongoose")

const quoteSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  message: String,

  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },

  vendor: {   
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "responded", "closed"],
    default: "pending"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});
module.exports = mongoose.model("Quote",quoteSchema);