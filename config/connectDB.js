const mongoose = require("mongoose");

const connectDB = async () => {
  try {

    if (!process.env.MONGO_URL) {
      console.log("MONGO_URI not found");
      return;
    }

    await mongoose.connect(process.env.MONGO_URL);

    console.log("MongoDB connected successfully");

  } catch (error) {
    console.log("DB connection failed:", error.message);
  }
};

module.exports = connectDB;