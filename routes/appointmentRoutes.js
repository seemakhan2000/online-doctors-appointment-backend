const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");


router.post("/", appointmentController.bookAppointment);
router.get("/", appointmentController.getAppointments);
router.put("/:id/confirm", appointmentController.confirmAppointment);
router.get("/doctor/:doctorId", appointmentController.getAppointmentsByDoctor);
router.delete("/:id", appointmentController.deleteAppointment );
router.get("/:id/availability", appointmentController.getDoctorAvailability);

module.exports = router;
