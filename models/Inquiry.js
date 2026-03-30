const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    team_name: { type: String },
    competition_type: { type: String },
    quantity: { type: Number },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Inquiry", inquirySchema);
