const express = require("express");
const axios = require("axios");
const router = express.Router();
const User = require("../models/User");
const { linkCodeforces } = require("../controllers/codeforcesController");
const authMiddleware = require("../middleware/authMiddleware");

// Route for linking Codeforces handle (now protected with middleware)
router.post("/link", authMiddleware, linkCodeforces);

// ✅ Fetch and update Codeforces user details
router.get("/user/:handle", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId; // ✅ Get user ID from auth middleware
        const { handle } = req.params;

        if (!handle) {
            return res.status(400).json({ error: "Codeforces handle is required" });
        }

        // Fetch user data from Codeforces API
        const response = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`);
        const userData = response.data.result[0];

        // ✅ Update user details in MongoDB based on userId, not handle
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    codeforcesHandle: userData.handle,
                    rating: userData.rating,
                    rank: userData.rank,
                    maxRating: userData.maxRating,
                    maxRank: userData.maxRank,
                },
            },
            { new: true }
        );

        res.json({
            handle: userData.handle,
            rank: userData.rank,
            rating: userData.rating,
            maxRank: userData.maxRank,
            maxRating: userData.maxRating,
            avatar: userData.titlePhoto,
        });

    } catch (error) {
        console.error("Error fetching Codeforces data:", error.message);
        res.status(500).json({ error: "Failed to fetch Codeforces user data from API." });
    }
});


// ✅ Fetch user data from MongoDB by email (For profile page)
router.get("/fetch-user", authMiddleware, async (req, res) => {
    try {
        // Get user ID from the token (added by middleware)
        const userId = req.user.userId;
        
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json({
            email: user.email,
            handle: user.codeforcesHandle || "Not linked",
            rank: user.rank || "N/A",
            rating: user.rating || "N/A",
            maxRank: user.maxRank || "N/A",
            maxRating: user.maxRating || "N/A",
            name: user.name || "",
            institution: user.institution || "",
            country: user.country || ""
        });

    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve user data from MongoDB." });
    }
});

module.exports = router;
