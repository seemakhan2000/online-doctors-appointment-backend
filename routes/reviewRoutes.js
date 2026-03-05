const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");

// Import the correct middleware
const { protect } = require("../middlewares/authMiddleware"); // <-- make sure this file exports protect

// Use it
router.post("/", protect, reviewController.submitReview);
router.get("/:doctorId", reviewController.getReviewsByDoctor);

module.exports = router;
