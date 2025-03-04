const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const axios = require("axios");

// Add a friend
router.post("/add", authMiddleware, async (req, res) => {
    try {
        const { handle } = req.body;
        
        // Validate Codeforces handle
        try {
            const cfResponse = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`);
            if (!cfResponse.data.result || cfResponse.data.result.length === 0) {
                return res.status(404).json({ error: "Codeforces handle not found" });
            }
        } catch (cfError) {
            return res.status(404).json({ error: "Invalid Codeforces handle" });
        }

        // Find user
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if friend already exists
        const friendExists = user.friends.some(friend => friend.handle === handle);
        if (friendExists) {
            return res.status(400).json({ error: "Friend already added" });
        }

        // Add friend
        user.friends.push({ handle });
        await user.save();

        res.json({ 
            message: "Friend added successfully", 
            friends: user.friends 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get friends list
router.get("/list", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Fetch Codeforces details for each friend
        const friendsWithDetails = await Promise.all(
            user.friends.map(async (friend) => {
                try {
                    const cfResponse = await axios.get(`https://codeforces.com/api/user.info?handles=${friend.handle}`);
                    const cfUserInfo = cfResponse.data.result[0];
                    return {
                        handle: friend.handle,
                        rating: cfUserInfo.rating,
                        rank: cfUserInfo.rank,
                        maxRating: cfUserInfo.maxRating,
                        maxRank: cfUserInfo.maxRank,
                        titlePhoto: cfUserInfo.titlePhoto
                    };
                } catch (error) {
                    // If CF API fails, return minimal info
                    return {
                        handle: friend.handle,
                        rating: "N/A",
                        rank: "N/A"
                    };
                }
            })
        );

        res.json(friendsWithDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Remove a friend
router.delete("/remove/:handle", authMiddleware, async (req, res) => {
    try {
        const { handle } = req.params;
        
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Remove friend
        user.friends = user.friends.filter(friend => friend.handle !== handle);
        await user.save();

        res.json({ 
            message: "Friend removed successfully", 
            friends: user.friends 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;