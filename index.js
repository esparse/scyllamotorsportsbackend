const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();

// ─────────────────────────────────────────
// ENV & CONFIG
// ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === "production") {
  console.log = () => {};
}

// ─────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("DB Error:", err));

// ─────────────────────────────────────────
// MIDDLEWARES
// ─────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",")
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────

// Core / Landing
app.use("/api", require("./routes/landingRoutes"));

// Teams
app.use("/api/teams", require("./routes/teamRoutes"));

// Vendors
app.use("/api/vendors", require("./routes/vendorRoutes")); 
// Vendor Dashboard
app.use("/api/vendors/dashboard", require("./routes/vendorRoutes"));

// Products
app.use("/api/products", require("./routes/productRoutes"));

// Marketplace
app.use("/api/marketplace", require("./routes/marketplaceRoutes"));

// Members
app.use("/api/members", require("./routes/memberRoutes"));

// Chat
app.use("/api/chat", require("./routes/chat"));

// Contact
app.use("/api/contact", require("./routes/contactRoute"));

// Admin (enable when needed)
app.use("/api/admin", require("./routes/adminRoutes"));

// ─────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────
app.get("/", (req, res) => {
  res.send(" Scylla Platform API Running");
});

// ─────────────────────────────────────────
// SERVER
// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});