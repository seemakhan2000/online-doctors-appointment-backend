const Doctor = require("../models/Doctor");
const Review = require("../models/Review")



// exports.getAllDoctors = async (req, res) => {
//   try {
//     const doctors = await Doctor.find().lean();
//     const doctorsWithReviews = await Promise.all(
//       doctors.map(async (doc) => {
//         const reviews = await Review.find({ doctor: doc._id }).lean();
//         const avgRating =
//           reviews.length > 0
//             ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
//             : 0;
//         return { ...doc, reviews, avgRating };
//       })
//     );
//     res.json(doctorsWithReviews);
//   } catch (err) {
//     console.error("GET DOCTORS ERROR:", err);   
//     res.status(500).json({ error: err.message }); 
//   }
// };




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
      })
    );
    res.json(doctorsWithReviews);
  } catch (err) {
    console.error("GET DOCTORS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ========== ADD DOCTOR ==========
// exports.addDoctor = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       phone,
//       specialization,
//       experience,
//       education,
//       certifications,
//       languages,
//       hospital,
//       availabilitySlots,
//     } = req.body;

//     // ✅ When using CloudinaryStorage
//     const imagePath = req.file ? req.file.path : "";

//     const doctor = new Doctor({
//       name,
//       email,
//       phone,
//       specialization,
//       experience,
//       education,
//       certifications,
//       languages,
//       hospital,
//       image: imagePath,
//       availabilitySlots: [],
//     });

//     let slots = [];
//     try {
//       slots = JSON.parse(availabilitySlots || "[]");
//     } catch (err) {
//       console.log("Invalid availability JSON");
//     }

//     slots.forEach((slot) => {
//       doctor.availabilitySlots.push({
//         type: slot.type || "weekly",
//         dayOfWeek: slot.dayOfWeek,
//         startTime: slot.startTime,
//         endTime: slot.endTime,
//         duration: slot.duration || 30,
//         date: slot.date || null,
//       });
//     });

//     await doctor.save();

//     res.status(201).json({ success: true, doctor });

//   } catch (error) {
//     console.error("Add Doctor Error:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };





exports.addDoctor = async (req, res) => {
  try {
    let imageUrl = "";
    if (req.file) {
      imageUrl = req.file.path; // Cloudinary URL
    }
 console.log("REQ FILE:", req.file);
    console.log("REQ BODY:", req.body);
    let slots = [];
    try {
      slots = JSON.parse(req.body.availabilitySlots || "[]");
    } catch (err) {
      console.log("Invalid availability JSON");
    }

    const doctor = new Doctor({
      name: req.body.name,
      specialization: req.body.specialization,
      email: req.body.email,
      phone: req.body.phone,
      experience: req.body.experience,
      education: req.body.education,
      certifications: req.body.certifications,
      languages: req.body.languages,
      hospital: req.body.hospital,
      image: imageUrl,
      availabilitySlots: slots
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      message: "Doctor added successfully",
      doctor
    });
  } catch (error) {
    console.error("ADD DOCTOR ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// function formatAvailabilitySlots(slots) {
//   const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

//   const formatTime = (d) => {
//     const date = new Date(d);
//     return date.toLocaleTimeString("en-US", {
//       hour: "numeric",
//       minute: "2-digit",
//       hour12: true,
//     });
//   };

//   // Step 1: Map slots
//   const mapped = slots.map((slot) => {
//     const start = new Date(slot.start);
//     const end = new Date(slot.end);

//     return {
//       weekday: start.getDay(),
//       day: days[start.getDay()],
//       startTime: formatTime(start),
//       endTime: formatTime(end),
//     };
//   });

//   // Step 2: Sort by weekday + time
//   mapped.sort((a, b) => {
//     if (a.weekday !== b.weekday) return a.weekday - b.weekday;
//     return a.startTime.localeCompare(b.startTime);
//   });

//   // Step 3: Return professional string
//   return mapped.map((s) => `${s.day} • ${s.startTime} - ${s.endTime}`);
// }








function formatAvailabilitySlots(slots) {

  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

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

  mapped.sort((a,b)=>{
    if(a.weekday !== b.weekday) return a.weekday - b.weekday;
    return a.startTime.localeCompare(b.startTime);
  });

  return mapped.map(s => `${s.day} • ${s.startTime} - ${s.endTime}`);
}






// GET doctor by ID and format slots
exports.getDoctorById = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const reviews = await Review.find({ doctor: doctorId }).populate("user", "name");

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


// exports.addDoctor = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       phone,
//       specialization,
//       experience,
//       education,
//       certifications,
//       languages,
//       hospital,
//       availabilitySlots,
//     } = req.body;

//     const imagePath = req.file ? req.file.path || req.file.filename || req.file.secure_url : "";

//     const doctor = new Doctor({
//       name,
//       email,
//       phone,
//       specialization,
//       experience,
//       education,
//       certifications,
//       languages,
//       hospital,
//       image: imagePath,
//       availabilitySlots: [],
//     });

//     // ONLY ONCE declare slots
//     const slots = Array.isArray(availabilitySlots)
//       ? availabilitySlots
//       : JSON.parse(availabilitySlots || "[]");

//     // Correct normalization
//     slots.forEach((slot) => {
//       doctor.availabilitySlots.push({
//         type: slot.type || "weekly",
//         dayOfWeek: slot.dayOfWeek,
//         startTime: slot.startTime,
//         endTime: slot.endTime,
//         duration: slot.duration || 30,
//         month: slot.month,
//         year: slot.year,
//         date: slot.date || null,
//       });
//     });

//     await doctor.save();

//     res.status(201).json({ success: true, doctor });
//   } catch (error) {
//     console.error("Add Doctor Error:", error);
//     res.status(500).json({ success: false, message: "Failed to add doctor" });
//   }
// };

// exports.updateDoctor = async (req, res) => {
//   try {
//     const doctor = await Doctor.findById(req.params.id);
//     if (!doctor)
//       return res
//         .status(404)
//         .json({ success: false, message: "Doctor not found" });

//     if (req.file) {
//       if (doctor.image) {
//         const oldPath = path.join(__dirname, "..", "public", doctor.image);
//         if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
//       }
//       doctor.image = req.file.path;
//     }

//     doctor.name = req.body.name || doctor.name;
//     doctor.specialization = req.body.specialization || doctor.specialization;
//     doctor.email = req.body.email || doctor.email;
//     doctor.phone = req.body.phone || doctor.phone;
//     doctor.experience = req.body.experience || doctor.experience;
//     doctor.education = req.body.education || doctor.education;
//     doctor.certifications = req.body.certifications || doctor.certifications;
//     doctor.languages = req.body.languages || doctor.languages;
//     doctor.hospital = req.body.hospital || doctor.hospital;

//     await doctor.save();

//     res.json({ success: true, message: "Doctor updated successfully", doctor });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };




exports.updateDoctor = async (req, res) => {
  try {

    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
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
      hospital
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
      doctor
    });

  } catch (error) {
    console.error("Update Doctor Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};




// exports.deleteDoctor = async (req, res) => {
//   try {
//     const doctor = await Doctor.findById(req.params.id);
//     if (!doctor)
//       return res
//         .status(404)
//         .json({ success: false, message: "Doctor not found" });

//     if (doctor.image) {
//       const imagePath = path.join(__dirname, "..", "public", doctor.image);
//       if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
//     }

//     await Doctor.findByIdAndDelete(req.params.id);
//     res.json({ success: true, message: "Doctor deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };




exports.deleteDoctor = async (req, res) => {
  try {

    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }

    // delete image from cloudinary
    if (doctor.image) {
      const publicId = doctor.image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`doctors/${publicId}`);
    }

    await Doctor.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Doctor deleted successfully"
    });

  } catch (error) {

    console.error("Delete Doctor Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



exports.searchDoctors = async (req, res) => {
  const query = req.query.q || "";
  try {
    const regex = new RegExp(query, "i");
    const doctors = await Doctor.find({
      $or: [{ name: regex }, { specialization: regex }],
    });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};