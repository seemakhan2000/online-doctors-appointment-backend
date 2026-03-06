const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "doctors",  // folder name in Cloudinary
    // removed allowed_formats => all formats allowed
  },
});

const upload = multer({ storage });

module.exports = upload;