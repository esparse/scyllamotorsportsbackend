const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],

    tagline: {
      type: String,
      trim: true
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },


    logo: {
      type: String,
      required: true // Cloudinary URL
    },

    verificationDoc: {
      type: String,
      required: true // Cloudinary URL
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    contactNo: {
      type: String,
      required: true
    },

    location: {
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number }
    },


    category: {
      type: String,
      enum: [
        // "FSAE",
        // "EV",
        // "BAJA",
        // "Moto",
        // "GoKart",
        // "Drag",
        // "Drift",
        // "RC",
        // "Karting",
        // "Robotics",
        // "Other"
        "Formula Racing",
        "Rally",
        "Endurance",
        "Motocross"
      ],
      required: true
    },

    achievements: [
      {
        title: { type: String, required: true },
        description: { type: String },
        type: { type: String, enum: ["gold", "blue", "green"], default: "gold" }, // for icon color
        year: { type: Number, default: new Date().getFullYear() }
      }
    ],


    password: {
      type: String,
      required: true,
      select: false // 🔐 security best practice
    },

    role: {
      type: String,
      enum: ["team"],
      default: "team"
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    // media: [{ type: String }],

    sponsors: [
      {
        name: { type: String, trim: true, required: true }, // sponsor name
        logo: { type: String, trim: true, required: true }, // Cloudinary URL
        category: { type: String, trim: true, default: "title" }, // title/platinum/gold/silver
        website: { type: String, trim: true, default: "" },
        initials: { type: String, trim: true } // first letter of name
      },
    ],
    // socialMedia: {
    //   instagram: { type: String, trim: true, default: "" },
    //   youtube: { type: String, trim: true, default: "" },
    //   linkedin: { type: String, trim: true, default: "" },
    //   twitter: { type: String, trim: true, default: "" },
    // },

    gallery: {
      type: [String],
      default: []
    },



  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", teamSchema);
