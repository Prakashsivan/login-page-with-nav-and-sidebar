const express = require("express");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const path = require("path");
const hbs = require("hbs");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();

dotenv.config({
  path: "./.env",
});

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASS,
  database: process.env.DATABASE,
});

db.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("MySQL Connection Success");
  }
});

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const location = path.join(__dirname, "./public");
app.use(express.static(location));
app.set("view engine", "hbs");

const partialsPath = path.join(__dirname, "./views/partials");
hbs.registerPartials(partialsPath);

// Route for sending password reset email
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  // Check if the email exists in the database
  const userQuery = `SELECT * FROM users WHERE email = ?`;
  const [user] = await db.promise().query(userQuery, [email]);

  if (user.length === 0) {
    return res.status(404).send('Email not found');
  }

  // Generate a token valid for 10 minutes
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '10m' });

  // Store the token and its expiry in the database
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
  const updateTokenQuery = `UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?`;
  await db.promise().query(updateTokenQuery, [token, expiry, email]);

  // Send the reset email
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
    text: `Click the link to reset your password: http://localhost:5000/reset-password/${token}`,
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      return res.status(500).send('Error sending email');
    }
    res.send('Password reset link sent to your email.');
  });
});

// Route for rendering the Reset Password page
app.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;

  // Check if the token is valid and has not expired
  const userQuery = `SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()`;
  const [user] = await db.promise().query(userQuery, [token]);

  if (user.length === 0) {
    return res.status(400).send('Invalid or expired token'); // or redirect to a page with an error message
  }

  res.render("reset-password", { token }); // Pass the token to the view
});

// Route for resetting password
app.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  // Get the user with the provided token
  const userQuery = `SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()`;
  const [user] = await db.promise().query(userQuery, [token]);

  if (user.length === 0) {
    return res.status(400).send('Invalid or expired token');
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(400).send('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatePasswordQuery = `UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE email = ?`;
    await db.promise().query(updatePasswordQuery, [hashedPassword, decoded.email]);

    res.send('Password has been updated successfully.');
  });
});

// Render course listing page
app.get('/courses', (req, res) => {
  let sql = 'SELECT * FROM courses';
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.render('courses', { courses: results });
  });
});

// Render add course page
app.get('/courses/add', (req, res) => {
  res.render('addCourse');
});

// Add a new course
app.post('/courses/add', (req, res) => {
  const newCourse = {
    title: req.body.title,
    duration: req.body.duration,
    difficulty: req.body.difficulty,
   
    modules: req.body.modules,
    delivery_mode: req.body.delivery_mode,
    price: req.body.price,
    description: req.body.description,
    image_url: req.body.image_url
  };
  
  let sql = 'INSERT INTO courses SET ?';
  db.query(sql, newCourse, (err, result) => {
    if (err) throw err;
    res.redirect('/courses');
  });
});

// Render update course page
app.get('/courses/edit/:id', (req, res) => {
  let sql = `SELECT * FROM courses WHERE id = ${req.params.id}`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.render('editCourse', { course: result[0] });
  });
});

// Update a course
app.post('/courses/edit/:id', (req, res) => {
  const updatedCourse = {
    title: req.body.title,
    duration: req.body.duration,
    difficulty: req.body.difficulty,

    modules: req.body.modules,
    delivery_mode: req.body.delivery_mode,
    price: req.body.price,
    description: req.body.description,
    image_url: req.body.image_url
  };
  
  let sql = `UPDATE courses SET ? WHERE id = ${req.params.id}`;
  db.query(sql, updatedCourse, (err, result) => {
    if (err) throw err;
    res.redirect('/courses');
  });
});

// Delete a course
app.get('/courses/delete/:id', (req, res) => {
  let sql = `DELETE FROM courses WHERE id = ${req.params.id}`;
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.redirect('/courses');
  });
});

// Fetch all courses
app.get('/courses', (req, res) => {
  const sql = 'SELECT * FROM courses';
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.render('moreCourses', { courses: result });
  });
});

// Add new course (POST request)
app.post('/courses/add', (req, res) => {
  const { title, duration, level, modules, price} = req.body;
  const sql = 'INSERT INTO courses (title, duration, level, modules, price ) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [title, duration, level, modules, price ], (err, result) => {
    if (err) throw err;
    res.redirect('/courses');
  });
});

// Delete a course
app.post('/courses/delete/:id', (req, res) => {
  const sql = 'DELETE FROM courses WHERE id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) throw err;
    res.redirect('/courses');
  });
});

// Update a course
app.post('/courses/update/:id', (req, res) => {
  const { title, duration, level, modules, price, } = req.body;
  const sql = 'UPDATE courses SET title = ?, duration = ?, level = ?, modules = ?, price = ?,  WHERE id = ?';
  db.query(sql, [title, duration, level, modules, price, req.params.id], (err, result) => {
    if (err) throw err;
    res.redirect('/courses');
  });
});

app.get('/course', (req, res) => {
  const sql = 'SELECT * FROM courses';
  db.query(sql, (err, result) => {
    if (err) {
      throw err;
    }
    res.render('course', {
      courses: result
    });
  });
});

// Routes
app.use("/", require("./routes/pages"));
app.use("/auth", require("./routes/auth"));

app.listen(5000, () => {
  console.log("Server Started @ Port 5000");
});
