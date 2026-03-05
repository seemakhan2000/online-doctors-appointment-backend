const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");

// In-memory session (prod me Redis / DB)
const sessions = {};

exports.chatBot = async (req, res) => {
  try {
    let text = req.body.message.toLowerCase().trim();
    const sessionId = req.body.sessionId || "default";

    if (!sessions[sessionId]) sessions[sessionId] = {};

    // Remove filler words for better matching
    text = text.replace(/doctor|please|show|available/g, "").trim();

    const messages = [];
    const allDoctors = await Doctor.find({});

    /* ================= GLOBAL COMMANDS ================= */
    if (["help", "menu", "what can you do"].includes(text)) {
      sessions[sessionId] = {};
      return res.json({
        messages: [
          {
            from: "bot",
            text: `🤖 I can help with:
• Doctor search
• Doctor profile
• Clinic timing
• Appointment booking 😊

Type doctor name or specialization`,
          },
        ],
      });
    }

    if (["cancel", "restart"].includes(text)) {
      sessions[sessionId] = {};
      return res.json({
        messages: [
          {
            from: "bot",
            text: "🔄 Booking cancelled. How can I help you?",
          },
        ],
      });
    }

    // === GENERAL DOCTOR INFO (name + keyword) ===
    const infoKeywords = [
      "email",
      "phone",
      "hospital",
      "experience",
      "specialization",
      "timing",
      "view timing",
    ];

    for (let keyword of infoKeywords) {
      if (text.includes(keyword)) {
        // Check if any doctor name is in the text
        const doctor = allDoctors.find((d) =>
          text.includes(d.name.toLowerCase()),
        );
        if (!doctor) continue;

        let infoText = `🩺 Doctor Details: 
Name: ${doctor.name}
Specialization: ${doctor.specialization}
Hospital: ${doctor.hospital}
Experience: ${doctor.experience}
Languages: ${doctor.languages}
Phone: ${doctor.phone}
Email: ${doctor.email}`;

        // If user asks for timing
        if (["timing", "view timing"].includes(keyword)) {
          if (doctor.availabilitySlots.length > 0) {
            const slots = doctor.availabilitySlots.map(
              (s, i) => `${i + 1}. ${formatSlot(s)}`,
            );
            infoText = `⏰ Available Timings for ${doctor.name}:\n${slots.join("\n")}\n👉 Type SLOT NUMBER to book`;
          } else {
            infoText = `❌ No available slots for ${doctor.name}`;
          }
        }

        return res.json({
          messages: [{ from: "bot", text: infoText }],
        });
      }
    }

    /* =====================================================
       🔹 BOOKING FLOW
    ===================================================== */
    if (sessions[sessionId].step) {
      const step = sessions[sessionId].step;

      /* STEP 1: SELECT DOCTOR */
      if (step === "selectDoctor") {
        const doctor = allDoctors.find((d) =>
          d.name.toLowerCase().includes(text),
        );

        if (!doctor) {
          return res.json({
            messages: [
              {
                from: "bot",
                text: "❌ Doctor not found. Please type exact doctor name.",
              },
            ],
          });
        }

        sessions[sessionId].doctorId = doctor._id;
        sessions[sessionId].step = "selectSlot";

        const slots = doctor.availabilitySlots.map(
          (s, i) => `${i + 1}. ${formatSlot(s)}`,
        );

        return res.json({
          messages: [
            {
              from: "bot",
              text: `🩺 ${doctor.name}
Specialization: ${doctor.specialization}
Hospital: ${doctor.hospital}

⏰ Available Timings:
${slots.join("\n")}

👉 Type SLOT NUMBER`,
            },
          ],
        });
      }

      /* STEP 2: SELECT SLOT */
      if (step === "selectSlot") {
        const doctor = await Doctor.findById(sessions[sessionId].doctorId);

        const slotIndex = parseInt(text) - 1;
        if (
          isNaN(slotIndex) ||
          slotIndex < 0 ||
          slotIndex >= doctor.availabilitySlots.length
        ) {
          return res.json({
            messages: [
              {
                from: "bot",
                text: "❌ Invalid slot. Please type slot number (1, 2, 3...)",
              },
            ],
          });
        }

        sessions[sessionId].slot = doctor.availabilitySlots[slotIndex];
        sessions[sessionId].step = "patientDetails";

        return res.json({
          messages: [
            {
              from: "bot",
              text: `📝 Patient Details
Format: Name, Phone

Example:
Seema, 03012345678`,
            },
          ],
        });
      }

      /* STEP 3: PATIENT DETAILS */
      if (step === "patientDetails") {
        const parts = text.split(",").map((p) => p.trim());

        if (parts.length < 2) {
          return res.json({
            messages: [
              {
                from: "bot",
                text: "❌ Invalid format. Use: Name, Phone",
              },
            ],
          });
        }

        const patientName = parts[0];
        const patientPhone = parts[1];
        const doctor = await Doctor.findById(sessions[sessionId].doctorId);
        const slot = sessions[sessionId].slot;

        await Appointment.create({
          patientName,
          patientPhone,
          doctor: doctor._id,
          dateTime: slot.date,
          slotTime: `${slot.startTime} - ${slot.endTime}`,
          status: "pending",
        });

        delete sessions[sessionId];

        return res.json({
          messages: [
            {
              from: "bot",
              text: `✅ Appointment Confirmed!

Doctor: ${doctor.name}
Specialization: ${doctor.specialization}
Hospital: ${doctor.hospital}

Patient: ${patientName}
Phone: ${patientPhone}
Time: ${formatSlot(slot)}

💙 Thank you for booking!`,
            },
          ],
        });
      }
    }

    /* =====================================================
       🔹 DOCTOR PROFILE / SPECIALIZATION SEARCH
    ===================================================== */
    // Exact or partial name search
    const doctorByName = allDoctors.filter((d) =>
      d.name.toLowerCase().includes(text),
    );

    // Specialization search (case-insensitive)
    const doctorsBySpec = allDoctors.filter((d) =>
      d.specialization.toLowerCase().includes(text),
    );

    let resultDoctors = [...new Set([...doctorByName, ...doctorsBySpec])]; // merge without duplicates

    if (resultDoctors.length > 0) {
      return res.json({
        messages: resultDoctors.map((d) => ({
          from: "bot",
          text: `🩺 ${d.name} (${d.specialization}) - ${d.hospital}\nExperience: ${d.experience}\nLanguages: ${d.languages}\n👉 Type "view timing" or "book appointment"`,
        })),
      });
    }

    /* =====================================================
       🔹 SHOW ALL DOCTORS
    ===================================================== */
    if (["doctor", "doctors"].includes(text)) {
      return res.json({
        messages: allDoctors.map((d) => ({
          from: "bot",
          text: `🩺 ${d.name} (${d.specialization}) - ${d.hospital}`,
        })),
      });
    }

    /* =====================================================
       🔹 START BOOKING
    ===================================================== */
    if (text.includes("book")) {
      sessions[sessionId].step = "selectDoctor";
      return res.json({
        messages: [
          {
            from: "bot",
            text: `📅 Appointment Booking Steps in the App:

1️⃣ Click the **View Profile** button of the doctor.
2️⃣ The **Doctor Profile** page will open showing all details.
3️⃣ Select the **Time Slot** you want.
4️⃣ Click the **Book Appointment** button.
5️⃣ Fill the **Patient Details Form**.
6️⃣ Click **Confirm Appointment** to finalize.

👉 Type the **Doctor Name** to start booking.`,
          },
        ],
      });
    }

    /* =====================================================
       🔹 FALLBACK
    ===================================================== */
    return res.json({
      messages: [
        {
          from: "bot",
          text: `I can help with:
• Doctor search
• Doctor profile
• Clinic timing
• Appointment booking 😊`,
        },
      ],
    });
  } catch (err) {
    console.error("ChatBot Error:", err);
    return res.status(500).json({
      messages: [{ from: "bot", text: "Server error 😢" }],
    });
  }
};

/* =====================================================
   🔹 SLOT FORMATTER
===================================================== */
function formatSlot(slot) {
  const to12 = (t) => {
    let [h, m] = t.split(":");
    h = parseInt(h);
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
  };
  return `${to12(slot.startTime)} - ${to12(slot.endTime)} on ${new Date(slot.date).toLocaleDateString()}`;
}
