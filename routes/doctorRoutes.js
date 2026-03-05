const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const path = require("path");

// Multer Config
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "doctors",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });


// Routes
router.get("/search", doctorController.searchDoctors);
router.get("/", doctorController.getAllDoctors);
router.post("/", upload.single("image"), doctorController.addDoctor);
router.get("/:id", doctorController.getDoctorById);
router.put("/:id", upload.single("image"), doctorController.updateDoctor);
router.delete("/:id", doctorController.deleteDoctor);


module.exports = router;


