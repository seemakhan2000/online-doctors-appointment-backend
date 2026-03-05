const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const sendEmail = require("../utils/email");

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatDateTime = (datetime) => {
  const d = new Date(datetime);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const date = `${day}/${month}/${year}`;

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const time = `${hours}:${minutes}${ampm}`;

  return { date, time };
};

exports.getDoctorAvailability = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const { from, to } = req.query;
    if (!from || !to)
      return res.status(400).json({ message: "from and to query required" });

    const startDate = new Date(from);
    const endDate = new Date(to);

    // Fetch booked appointments in the range
    const appointments = await Appointment.find({
      doctor: doctor._id,
      datetime: { $gte: startDate, $lte: endDate },
    });

    const slots = [];

    // Loop through each day
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dayOfWeek = d.getDay();

      // Filter availability rules for this day
      const rules = doctor.availabilitySlots.filter((r) => {
        if (r.type === "weekly") {
          let match = r.dayOfWeek === dayOfWeek;
          if (r.month !== undefined) match = match && d.getMonth() === r.month;
          if (r.year !== undefined) match = match && d.getFullYear() === r.year;
          return match;
        } else if (r.type === "date") {
          return new Date(r.date).toDateString() === d.toDateString();
        }
        return false;
      });

      // Generate slots for each rule
      rules.forEach((rule) => {
        const [startH, startM] = rule.startTime.split(":").map(Number);
        const [endH, endM] = rule.endTime.split(":").map(Number);

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        let slotStart = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
          startH,
          startM,
        );

        let slotEnd = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
          endH,
          endM,
        );

        while (slotStart < slotEnd) {
          const booked = appointments.some(
            (a) => new Date(a.datetime).getTime() === slotStart.getTime(),
          );

          slots.push({
            start: slotStart,
            end: new Date(slotStart.getTime() + rule.duration * 60000),
            booked,
            dayName: days[d.getDay()],
            monthName: months[d.getMonth()],
            duration: rule.duration,
            type: rule.type,
            date: rule.date,
          });

          slotStart = new Date(slotStart.getTime() + rule.duration * 60000);
        }
      });
    }

    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.bookAppointment = async (req, res) => {
  try {
    const { doctor, patientName, patientEmail, start } = req.body;

    if (!doctor || !patientName || !start) {
      return res
        .status(400)
        .json({ message: "Doctor, patient name, and start time are required" });
    }

    const doctorDoc = await Doctor.findById(doctor);
    if (!doctorDoc) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const startDate = new Date(start);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ message: "Invalid date/time" });
    }

    // Check if slot already booked
    const exists = await Appointment.findOne({
      doctor,
      datetime: startDate,
    });
    if (exists) {
      return res.status(409).json({ message: "Slot already booked" });
    }

    // Find availability rule
    const rule = doctorDoc.availabilitySlots.find((r) => {
      if (r.type === "weekly") {
        return (
          r.dayOfWeek === startDate.getUTCDay() &&
          (r.month === undefined || r.month === startDate.getUTCMonth()) &&
          (r.year === undefined || r.year === startDate.getUTCFullYear())
        );
      }

      if (r.type === "date" && r.date) {
        const ruleDate = new Date(r.date);
        return (
          ruleDate.getFullYear() === startDate.getFullYear() &&
          ruleDate.getMonth() === startDate.getMonth() &&
          ruleDate.getDate() === startDate.getDate()
        );
      }

      return false;
    });

    if (!rule) {
      return res.status(400).json({ message: "No slot available for this day" });
    }

    // Save appointment
    const appointment = new Appointment({
      doctor,
      patientName,
      patientEmail,
      datetime: startDate,
      duration: rule.duration || 30,
      status: "pending",
    });
    await appointment.save();

    // Send booking email (HTML)
    if (patientEmail) {
      const subject = "Appointment Request Received";
      const html = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
          <h2 style="color: #007bff;">Appointment Request Received</h2>
          <p>Hello ${patientName},</p>
          <p>We have received your appointment request with <strong>Dr. ${doctorDoc.name}</strong> (${doctorDoc.specialization}).</p>
          <p><strong>📅 Date & Time:</strong> ${startDate.toLocaleString()}</p>
          <p><strong>🏥 Hospital / Clinic:</strong> ${doctorDoc.hospital || "N/A"}</p>
          <p>Your appointment is currently <strong>pending</strong>. You will receive a confirmation email once Dr. ${doctorDoc.name} confirms the appointment.</p>
          <p>Thank you for choosing our service!</p>
          <p style="margin-top: 20px;">— Your Clinic Team</p>
        </div>
      `;

      try {
  await sendEmail(
    patientEmail, 
    subject,      
    "Your appointment request has been received", 
    html          
  );
  console.log("Booking email sent to:", patientEmail);
} catch (err) {
  console.error("Failed to send booking email:", err);
}
    }

    res.status(201).json({ success: true, appointment });
  } catch (err) {
    console.error("Error booking appointment:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




//  Get appointments by doctor (for calendar)
exports.getAppointmentsByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const appointments = await Appointment.find({ doctor: doctorId });

    // Convert datetime to start/end for calendar
    const result = appointments.map((app) => {
      const start = new Date(app.datetime);
      const end = new Date(start.getTime() + 30 * 60000); // assume 30 min slot

      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const appointments = await Appointment.find(query)
      .populate("doctor", "name specialization")
      .sort({ datetime: -1 });

    const formatted = appointments.map((app) => {
      const { date, time } = formatDateTime(app.datetime);

      return {
        _id: app._id,
        patientName: app.patientName,

        doctor: app.doctor
          ? {
              _id: app.doctor._id,
              name: app.doctor.name,
              specialization: app.doctor.specialization,
            }
          : null,

        date,
        time,
        status: app.status || "pending",
      };
    });

    res.json({ success: true, appointments: formatted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.confirmAppointment = async (req, res) => {
  try {
    const id = req.params.id;

    const updated = await Appointment.findByIdAndUpdate(
      id,
      { status: "confirmed" },
      { new: true },
    ).populate("doctor", "name email");

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });

    if (!updated.patientEmail) {
      return res.status(200).json({
        success: true,
        message: "Appointment confirmed but patient email is missing.",
      });
    }

    const subject = "Your Appointment is Confirmed!";
    const text = `Hello ${updated.patientName},

Your appointment with Dr. ${updated.doctor.name} on ${updated.datetime.toLocaleString()} has been successfully confirmed.

Thank you!`;

    try {
      await sendEmail(updated.patientEmail, subject, text);
      console.log("Email sent successfully to:", updated.patientEmail);
    } catch (emailErr) {
      console.error("Failed to send email:", emailErr);
      return res.status(500).json({
        success: false,
        message: "Appointment confirmed but failed to send email.",
      });
    }

    res.json({
      success: true,
      message: "Appointment confirmed and email sent!",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Appointment.findByIdAndDelete(id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    res.json({ success: true, message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
