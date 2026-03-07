const express = require("express");
const router = express.Router();

const doctorController = require("../controllers/doctorController");
const upload = require("../middlewares/upload");

router.get("/", doctorController.getAllDoctors);

router.post("/", upload.single("image"), doctorController.addDoctor);

router.get("/:id", doctorController.getDoctorById);

router.put("/:id", upload.single("image"), doctorController.updateDoctor);

router.delete("/:id", doctorController.deleteDoctor);

router.get("/search", doctorController.searchDoctors);

module.exports = router;