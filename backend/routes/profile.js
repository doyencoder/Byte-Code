// Add this to your profile.js routes file

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// Get profile data
router.get("/", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        res.json({
            email: user.email,
            name: user.name,
            institution: user.institution,
            country: user.country
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Update profile data
router.post("/update", authMiddleware, async (req, res) => {
    try {
        const { name, institution, country } = req.body;
        
        // Find user by ID from token
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // Update fields if provided
        if (name) user.name = name;
        if (institution) user.institution = institution;
        if (country) user.country = country;
        
        await user.save();
        
        res.json({
            message: "Profile updated successfully",
            user: {
                email: user.email,
                name: user.name,
                institution: user.institution,
                country: user.country
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;