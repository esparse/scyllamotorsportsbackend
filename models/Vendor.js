const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true },
    logo: { type: String, required: true },
    banner: { type: String, required: true },

    category: {
      type: String,
      required: true
    },

    gstNumber: { type: String, required: true },
    verificationDoc: { type: String, required: true },


    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: { type: String, required: true },

    role: { type: String, default: "vendor" },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    location: { type: String },

    media: [{ type: String }],

    description: { type: String, defualt: "" },

    companyDesc: { type: String, defualt: "" },

    gallery: {
      type: [String],
      default: []
    },

    businessHours: [
      {
        day: { type: String, required: true },
        start: { type: String }, // "09:00"
        end: { type: String },   // "17:00"
        closed: { type: Boolean, default: false }
      }
    ],

    services: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true
          },
          icon: {
            type: String,
            enum: ["⚙️", "🔧", "🏁", "📊", "✏️", "📈", "⚡", "🛡️"],
            required: true
          }
        }
      ],
      default: []
    },

    projects: [
  {
    title: { type: String, required: true },
    desc: { type: String },
    image: { type: String }, // Cloudinary URL
    createdAt: { type: Date, default: Date.now }
  }
],



    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vendor", vendorSchema);
