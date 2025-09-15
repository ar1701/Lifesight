require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const passport = require("passport");

// Passport Config
require("./config/passport")(passport);

const indexRouter = require("./routes/index");
const authRouter = require("./routes/auth");
const widgetRouter = require("./routes/widget");
const dashboardRouter = require("./routes/dashboard");
const marketingRouter = require("./routes/marketing");

const app = express();

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Express session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Global variables for user
app.use(function (req, res, next) {
  res.locals.user = req.user || null;
  next();
});

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully."))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/", authRouter);
app.use("/app", indexRouter);
app.use("/api/widgets", widgetRouter);
app.use("/api/dashboards", dashboardRouter);
app.use("/api/marketing", marketingRouter);

app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/app");
  } else {
    res.redirect("/login");
  }
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).send("Sorry, can't find that!");
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);

  // Check if this is an API request
  if (
    req.path.startsWith("/api/") ||
    req.headers.accept?.includes("application/json")
  ) {
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }

  // For regular page requests, send a proper error page
  res.status(500).render('error', {
    title: 'Error',
    message: 'Something went wrong. Please try again.',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
