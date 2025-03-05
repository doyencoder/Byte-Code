const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Set up Passport.js with Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID, // Add these to your .env file
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists in our database
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // User exists, return the user
          return done(null, user);
        } else {
          // Create a new user with Google data
          const randomPassword = Math.random().toString(36).slice(-10);
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          
          const newUser = new User({
            email: profile.emails[0].value,
            password: hashedPassword, // Random secure password
            name: profile.displayName || profile.emails[0].value.split('@')[0] // Use display name or create from email
          });
          
          await newUser.save();
          return done(null, newUser);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Passport Serialize and Deserialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Initialize passport in your Express app (add this to your main server.js file)
// app.use(passport.initialize());
// app.use(passport.session());

// Google OAuth Routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login.html" }),
  (req, res) => {
    // Generate JWT token for the authenticated user
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: "6h" });
    
    // Redirect to frontend with token (you'll need to handle this on the frontend)
    res.redirect(`/auth-success.html?token=${token}&email=${req.user.email}`);
  }
);

router.get("/user", authMiddleware, async (req, res) => {
  try {
    // Example: using req.user.userId or req.user.id, depending on how you set it up
    const user = await User.findById(req.user.userId).select("codeforcesHandle");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ codeforcesHandle: user.codeforcesHandle });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// Signup
router.post("/signup", async (req, res) => {
    const { email, password } = req.body;
    console.log("working part 3 from auth.js");
    console.log("Email received from frontend:", email);

    try {
        console.log("working part 4 from auth.js"); //debugging
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: "User already exists" });
        console.log("working part 5 from auth.js"); //Debugging
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ email, password: hashedPassword });
        console.log(`Working part 6 ${user}`); //Debugging
        await user.save();
        console.log("working part 7");//Debugging
        res.json({ message: "Signup successful!" });

    } catch (err) {
        console.log("Error here");
        res.status(500).json({ error: "Server error" });
    }
});

// Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    console.log("🔹 [Backend] Email received from frontend:", email);

    try {
        const user = await User.findOne({ email });
        console.log("User found in DB:", user);
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "6h" });

        res.json({ token, email: user.email });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
});

module.exports = router;