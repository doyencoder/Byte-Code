const express = require("express");
const axios = require("axios");
const router = express.Router();
const User = require("../models/User");
const { linkCodeforces } = require("../controllers/codeforcesController");

// Route for linking Codeforces handle
router.post("/link", linkCodeforces);

// ✅ Fetch and update Codeforces user details
router.get("/user/:handle", async (req, res) => {
    const { handle } = req.params;

    if (!handle) {
        return res.status(400).json({ error: "Codeforces handle is required" });
    }

    try {
        // Fetch user data from Codeforces API
        const response = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`);
        const userData = response.data.result[0];

        // Update user details in MongoDB
        const updatedUser = await User.findOneAndUpdate(
            { codeforcesHandle: handle },
            {
                $set: {
                    rating: userData.rating,
                    rank: userData.rank,
                    maxRating: userData.maxRating,
                    maxRank: userData.maxRank,
                },
            },
            { new: true, upsert: false }
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
        res.status(500).json({ error: "Failed to fetch Codeforces user data from API." });
    }
});

// ✅ Fetch user data from MongoDB by email (For profile page)
router.get("/fetch-user", async (req, res) => {
    const { email } = req.query;  // Get email from frontend

    if (!email) {
        return res.status(400).json({ error: "Email is required." });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json({
            handle: user.codeforcesHandle || "Not linked",
            rank: user.rank || "N/A",
            rating: user.rating || "N/A",
            maxRank: user.maxRank || "N/A",
            maxRating: user.maxRating || "N/A",
            
        });
        

    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve user data from MongoDB." });
    }
});

module.exports = router;
