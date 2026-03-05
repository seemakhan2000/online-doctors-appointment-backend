const Review = require("../models/Review");

exports.getReviewsByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const reviews = await Review.find({ doctor: doctorId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};

exports.submitReview = async (req, res) => {
  const { doctor, rating, comment } = req.body;

  if (!doctor || !rating || !comment) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const review = new Review({
      doctor,
      rating,
      comment,
      user: req.user._id, // ✅ comes from protect middleware
    });

    await review.save();
    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
