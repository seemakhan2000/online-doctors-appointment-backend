const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const moment = require("moment-timezone");

exports.getDashboardStats = async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const totalPatients = await  Appointment.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const today = moment().tz("Asia/Karachi").format("YYYY-MM-DD");
    const startOfDayUTC = moment.tz(`${today} 00:00`, "Asia/Karachi").utc().toDate();
    const endOfDayUTC = moment.tz(`${today} 23:59:59`, "Asia/Karachi").utc().toDate();
    const appointmentsToday = await Appointment.countDocuments({
      datetime: { $gte: startOfDayUTC, $lte: endOfDayUTC }
    });

    res.json({
      success: true,
      stats: {
        totalDoctors,
        totalPatients,
        totalAppointments,
        appointmentsToday
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
