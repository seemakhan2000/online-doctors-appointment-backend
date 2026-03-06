const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const upload = require("../middlewares/upload");
// Search
router.get("/search", doctorController.searchDoctors);

// Get all doctors
router.get("/", doctorController.getAllDoctors);

// Add doctor
router.post("/", upload.single("image"), doctorController.addDoctor);

// Get doctor by id
router.get("/:id", doctorController.getDoctorById);

// Update doctor
router.put("/:id", upload.single("image"), doctorController.updateDoctor);

// Delete doctor
router.delete("/:id", doctorController.deleteDoctor);

module.exports = router;