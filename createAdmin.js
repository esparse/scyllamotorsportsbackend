require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin"); 

console.log("Starting admin creation script...");

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    createAdmin();
  })
  .catch(err => console.log("MongoDB connection error:", err));

async function createAdmin() {
  try {
    const existing = await Admin.findOne({ email: "admin@example.com" });
    if (existing) {
      console.log("Admin already exists!");
      mongoose.disconnect();
      return;
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10); 
    const admin = new Admin({
      name: "Super Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin"
    });

    await admin.save();
    console.log("Admin account created successfully!");
  } catch (err) {
    console.error("Error creating admin:", err);
  } finally {
    mongoose.disconnect();
  }
}
