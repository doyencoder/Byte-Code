require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const path = require("path");
const authRoutes = require("./routes/auth");
const codeforcesRoutes = require("./routes/codeforces"); // Import Codeforces routes
const profileRoutes = require("./routes/profile"); // Import profile routes
const friendsRoutes = require("./routes/friends"); // Import Friends Routes
const comparisonRoutes = require("./routes/comparison"); //ImportComparison Routes
const contestRoutes = require("./routes/contest");


const app = express();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'base.html'));
});
  

// Middleware
app.use(express.json());
app.use(cors({
  origin: "https://byte-code.onrender.com", // Update this to match your frontend URL
  credentials: true
}));

// Session configuration (must be before passport initialization)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Static files
const rootDir = path.join(__dirname, ".."); // Go one level up from backend

app.use(express.static(rootDir)); // Assuming your HTML files are in a 'public' folder

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/codeforces", codeforcesRoutes); // Register Codeforces route
app.use("/api/profile", profileRoutes); // Register profile route
app.use("/api/friends", friendsRoutes); //Aff friends route
app.use("/api/comparison", comparisonRoutes); //friend comparison route
app.use("/api/contest", contestRoutes);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));