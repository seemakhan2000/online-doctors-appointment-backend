const express = require("express");
const router = express.Router();  
const userController = require("../controllers/userController");
const forgetPasswordController = require("../controllers/forgetPasswordController");
const resetPasswordController= require("../controllers/resetPasswordController");

router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.post("/forgot-password", forgetPasswordController.forgotPassword);
router.post("/reset-password/:token", resetPasswordController.resetPassword);


module.exports = router;
