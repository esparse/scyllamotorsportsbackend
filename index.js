const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path")
const chatRoutes = require("./routes/chat");




dotenv.config();

if (process.env.NODE_ENV === "production") {
  console.log = () => {};
}



const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",")
  : [];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// app.use(cors({ origin: "http://localhost:5173", credentials: true }));


mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error(err));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", require("./routes/landingRoutes"))

app.use("/api/teams", require("./routes/teamRoutes"));

app.use("/api/vendors", require("./routes/vendorRoutes"));

app.use("/api/admin", require("./routes/adminRoutes"));

// app.use("/api/products", require("./routes/productRoutes"));

app.use("/api/vehicles", require("./routes/vehicleRoutes"));

app.use("/api/products", require('./routes/productRoutes'));

app.use('/api/member', require("./routes/memberRoutes"));

app.use("/api/chat", chatRoutes);

// app.use('/api/activity', require("./routes/activityRoutes"))

// app.use('/api/activity', require("./routes/activityRoutes"));




// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173", // client
//       "http://localhost:5174", // vite fallback
//       "http://localhost:5175", // admin
//     ],
//     credentials: true,
//   })
// );



// const http = require("http");
// const { Server } = require("socket.io");

// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
//     credentials: true,
//   },
// });

// require("./socket/chatSocket")(io);



app.listen(5000, () => {
  console.log("Server running on port 5000");
});
