const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

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

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.json({ token, email: user.email });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});


router.post("/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
});

module.exports = router;
