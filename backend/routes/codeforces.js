const express = require("express");
const axios = require("axios");
const router = express.Router();
const User = require("../models/User");
const { linkCodeforces } = require("../controllers/codeforcesController");

// Define POST route for linking Codeforces handle
router.post("/link", linkCodeforces);

// ✅ Route to fetch Codeforces user details
router.get("/user/:handle", async (req, res) => {
    const { handle } = req.params;  // ✅ Get the handle from URL parameter

    if (!handle) {
        return res.status(400).json({ error: "Codeforces handle is required" });
    }
    console.log(`${handle}`);
    try {
        // ✅ Fetch user data from Codeforces API
        const response = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`);
        
        const userData = response.data.result[0];

        const updatedUser = await User.findOneAndUpdate(
            { codeforcesHandle: handle }, // Search by Codeforces handle
            {
                $set: {
                    rating: userData.rating,
                    rank: userData.rank,
                    maxRating: userData.maxRating,
                    maxRank: userData.maxRank,
                },
            },
            { new: true, upsert: false } // ✅ Do not create a new user if not found
        );

        // ✅ Return the extracted data as JSON
        res.json({
            handle: userData.handle,
            rank: userData.rank,
            rating: userData.rating,
            maxRank: userData.maxRank,
            maxRating: userData.maxRating,
            avatar: userData.titlePhoto,
        });

    } catch (error) {
        res.status(500).json({ error: "Failed to fetch Codeforces user data error from codeforces.js" });
    }
});

module.exports = router;
