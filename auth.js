const express = require("express");
const userController = require("../controllers/users");
const router = express.Router();

// User Registration
router.post("/register", userController.register);

// User Login
router.post("/login", userController.login);

// User Logout
router.get("/logout", userController.logout);

// Forgot Password
router.post("/forgot-password", userController.forgotPassword);

// Reset Password
router.post("/reset-password", userController.resetPassword);

module.exports = router;
