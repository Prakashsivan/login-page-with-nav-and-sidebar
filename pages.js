const express = require("express");
const router = express.Router();
const userController = require("../controllers/users");

// Render Login Page
router.get(["/", "/login"], (req, res) => {
  res.render("login");
});

// Render Registration Page
router.get("/register", (req, res) => {
  res.render("register");
});

// Render Forgot Password Page
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password");
});

// Render Reset Password Page
router.get("/reset-password", (req, res) => {
  const { token } = req.query; // Get token from query params
  if (!token) {
    return res.status(400).render("reset-password", {
      msg: "Invalid token",
      msg_type: "error",
    });
  }
  res.render("reset-password", { token }); // Pass the token to the view
});

// Handle Reset Password Submission
router.post("/reset-password", userController.resetPassword); // This assumes you have a resetPassword method in your userController

// Render Course Page (Protected)
router.get("/course", userController.isLoggedIn, (req, res) => {
  if (req.user) {
    res.render("course", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

router.get("/courses", userController.isLoggedIn, (req, res) => {
  if (req.user) {
    res.render("courses", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

router.get("/editCourse", userController.isLoggedIn, (req, res) => {
  if (req.user) {
    res.render("editCourse", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

router.get("/addCourse", userController.isLoggedIn, (req, res) => {
  if (req.user) {
    res.render("addCourse", { user: req.user });
  } else {
    res.redirect("/login");
  }
});



// Render Profile Page (Protected)
router.get("/profile", userController.isLoggedIn, (req, res) => {
  if (req.user) {
    res.render("profile", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

// Render Profile Page (Protected)
router.get("/videos", userController.isLoggedIn, (req, res) => {
  if (req.user) {
    res.render("videos", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

// Render Home Page (Protected)
router.get("/home", userController.isLoggedIn, (req, res) => {
  if (req.user) {
    res.render("home", { user: req.user });
  } else {
    res.redirect("/");
  }
});

router.get("/chat_boxai-main", userController.isLoggedIn, (req, res) => {
  if (req.user) {
    res.render("chat_boxai-main", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

module.exports = router;
