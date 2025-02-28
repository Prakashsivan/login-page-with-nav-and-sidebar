const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const nodemailer = require("nodemailer");

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASS,
  database: process.env.DATABASE,
});

// Login function
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).render("login", {
        msg: "Email not registered",
        msg_type: "error",
      });
    }

    db.query(
      "SELECT * FROM users WHERE email=?",
      [email],
      async (error, result) => {
        if (result.length <= 0) {
          return res.status(401).render("login", {
            msg: "Email not registered",
            msg_type: "error",
          });
        } else {
          if (!(await bcrypt.compare(password, result[0].PASS))) {
            return res.status(401).render("login", {
              msg: "Invalid Password",
              msg_type: "error",
            });
          } else {
            const id = result[0].ID;
            const token = jwt.sign({ id: id }, process.env.JWT_SECRET, {
              expiresIn: process.env.JWT_EXPIRES_IN,
            });
            const cookieOptions = {
              expires: new Date(
                Date.now() +
                  process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
              ),
              httpOnly: true,
            };
            res.cookie("hexa", token, cookieOptions);
            res.status(200).redirect("/home");
          }
        }
      }
    );
  } catch (error) {z
    console.log(error);
  }
};

// Register function
exports.register = (req, res) => {
  const { name, email, password, confirm_password } = req.body;
  db.query(
    "SELECT email FROM users WHERE email=?",
    [email],
    async (error, result) => {
      if (error) {
        console.log(error);
      }

      if (result.length > 0) {
        return res.render("register", {
          msg: "Email id already Taken",
          msg_type: "error",
        });
      } else if (password !== confirm_password) {
        return res.render("register", {
          msg: "Passwords do not match",
          msg_type: "error",
        });
      }
      let hashedPassword = await bcrypt.hash(password, 8);
      db.query(
        "INSERT INTO users SET ?",
        { name: name, email: email, pass: hashedPassword },
        (error, result) => {
          if (error) {
            console.log(error);
          } else {
            return res.render("register", {
              msg: "User Registration Success",
              msg_type: "success",
            });
          }
        }
      );
    }
  );
};

// Check if user is logged in
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.hexa) {
    try {
      const decode = await promisify(jwt.verify)(
        req.cookies.hexa,
        process.env.JWT_SECRET
      );
      db.query(
        "SELECT * FROM users WHERE id=?",
        [decode.id],
        (err, results) => {
          if (!results) {
            return next();
          }
          req.user = results[0];
          return next();
        }
      );
    } catch (error) {
      console.log(error);
      return next();
    }
  } else {
    next();
  }
};

// Logout function
exports.logout = async (req, res) => {
  res.cookie("hexa", "logout", {
    expires: new Date(Date.now() + 2 * 1000),
    httpOnly: true,
  });
  res.status(200).redirect("/");
};

// Forgot Password function
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  db.query("SELECT * FROM users WHERE email=?", [email], async (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).render("forgot-password", {
        msg: "Error occurred, please try again later",
        msg_type: "error",
      });
    }

    if (result.length === 0) {
      return res.status(404).render("forgot-password", {
        msg: "Email not registered",
        msg_type: "error",
      });
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '10m' });

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset',
      text: `Click the link to reset your password: http://localhost:5000/reset-password?token=${token}`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.log(error);
        return res.status(500).render("forgot-password", {
          msg: "Error sending email, please try again",
          msg_type: "error",
        });
      }
      res.render("forgot-password", {
        msg: "Password reset link sent to your email",
        msg_type: "success",
      });
    });
  });
};

// Reset Password function
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.render("reset-password", {
        msg: "Invalid or expired token",
        msg_type: "error",
      });
    }

    // Check if the user exists based on the email from the token
    db.query("SELECT * FROM users WHERE email=?", [decoded.email], async (error, results) => {
      if (error || results.length === 0) {
        return res.render("reset-password", {
          msg: "User not found, please try again",
          msg_type: "error",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.query(
        "UPDATE users SET pass = ? WHERE email = ?",
        [hashedPassword, decoded.email],
        (error) => {
          if (error) {
            console.log(error);
            return res.render("reset-password", {
              msg: "Error updating password, please try again",
              msg_type: "error",
            });
          }

          // Successful password update
        return res.json({
          msg: "Password has been updated successfully",
          msg_type: "success",
        })
        }
      );
    });
  });
};
