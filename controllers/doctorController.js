const Doctor = require("../models/Doctor");
const Review = require("../models/Review");
const cloudinary = require("../config/cloudinary");

exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().lean();
    const doctorsWithReviews = await Promise.all(
      doctors.map(async (doc) => {
        const reviews = await Review.find({ doctor: doc._id }).lean();
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;
        return { ...doc, reviews, avgRating };
      }),
    );
    res.json(doctorsWithReviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addDoctor = async (req, res) => {
  try {
    let imageUrl = "";
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "doctors",
      });
      imageUrl = result.secure_url;
    }

    // Parse availabilitySlots safely
    let slots = [];
    if (req.body.availabilitySlots) {
      try {
        slots = JSON.parse(req.body.availabilitySlots);
      } catch (err) {
        console.error("Slots JSON parse error:", err);
        return res.status(400).json({
          success: false,
          message: "Invalid availabilitySlots JSON",
        });
      }
    }

    const doctor = new Doctor({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      specialization: req.body.specialization,
      experience: req.body.experience,
      education: req.body.education,
      certifications: req.body.certifications,
      languages: req.body.languages,
      hospital: req.body.hospital,
      image: imageUrl,
      availabilitySlots: slots,
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      message: "Doctor added successfully",
      doctor,
    });
  } catch (error) {
    console.error("ADD DOCTOR ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

function formatAvailabilitySlots(slots) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatTime = (d) => {
    const date = new Date(d);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const mapped = slots.map((slot) => {
    const start = new Date(`1970-01-01T${slot.startTime}`);
    const end = new Date(`1970-01-01T${slot.endTime}`);

    return {
      weekday: slot.dayOfWeek,
      day: days[slot.dayOfWeek],
      startTime: formatTime(start),
      endTime: formatTime(end),
    };
  });

  mapped.sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    return a.startTime.localeCompare(b.startTime);
  });

  return mapped.map((s) => `${s.day} • ${s.startTime} - ${s.endTime}`);
}

// GET doctor by ID and format slots
exports.getDoctorById = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const reviews = await Review.find({ doctor: doctorId }).populate(
      "user",
      "name",
    );

    const formattedSlots = formatAvailabilitySlots(doctor.availabilitySlots);

    res.status(200).json({
      ...doctor.toObject(),
      reviews,
      availabilitySlots: formattedSlots,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const {
      name,
      specialization,
      email,
      phone,
      experience,
      education,
      certifications,
      languages,
      hospital,
    } = req.body;

    doctor.name = name;
    doctor.specialization = specialization;
    doctor.email = email;
    doctor.phone = phone;
    doctor.experience = experience;
    doctor.education = education;
    doctor.certifications = certifications;
    doctor.languages = languages;
    doctor.hospital = hospital;

    // update image if uploaded
    if (req.file) {
      doctor.image = req.file.path;
    }

    await doctor.save();

    res.json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error("Update Doctor Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    if (doctor.image) {
      const publicId = doctor.image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`doctors/${publicId}`);
    }

    await Doctor.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (error) {
    console.error("Delete Doctor Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.searchDoctors = async (req, res) => {
  try {
    const query = req.query.q || "";

    const doctors = await Doctor.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { specialization: { $regex: query, $options: "i" } },
      ],
    });

    res.json(doctors);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
