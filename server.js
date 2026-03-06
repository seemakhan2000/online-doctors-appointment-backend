const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
dotenv.config();

const cloudinary = require("./config/cloudinary");
const connectDB = require("./config/connectDB");
const authRoutes = require("./routes/authRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const admindashboard = require("./routes/admindashboard");
const adminRoutes = require("./routes/authRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const userRoutes = require("./routes/userRoute");
const chatRoutes = require("./routes/chatRoutes");
const sendEmail = require("./utils/email");

const app = express();

app.use(cors({
 origin: [
   "https://online-doctors-appointments-frontend.netlify.app",
   "http://localhost:3000"
 ],
 credentials: true
}));

app.use(express.json());

// connect db INSIDE handler safe zone
connectDB();

// routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin/dashboard", admindashboard);
app.use("/api/reviews", reviewRoutes);
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/email", sendEmail);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Online Doctor Appointment API",
  });
});

if (!process.env.VERCEL) {
  app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
  });
}

module.exports = app;