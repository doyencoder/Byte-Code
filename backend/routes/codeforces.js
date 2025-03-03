const express = require("express");
const axios = require("axios");
const router = express.Router();
const User = require("../models/User");
const { linkCodeforces } = require("../controllers/codeforcesController");
const authMiddleware = require("../middleware/authMiddleware");

// Route for linking Codeforces handle (now protected with middleware)
router.post("/link", authMiddleware, linkCodeforces);

// Fetch and update Codeforces user details
router.get("/user/:handle", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId; // Get user ID from auth middleware
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

// Route to fetch problems solved by a user
router.get("/solved-problems/:handle", authMiddleware, async (req, res) => {
    try {
        const { handle } = req.params;
        
        if (!handle) {
            return res.status(400).json({ error: "Codeforces handle is required" });
        }
        
        // Fetch user's submissions from Codeforces API
        const response = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}`);
        
        // Check if the API response is successful
        if (response.data.status !== "OK") {
            return res.status(400).json({ error: "Failed to fetch submissions data from Codeforces" });
        }
        
        // Extract the submissions from the response
        const submissions = response.data.result;
        
        // Extract unique solved problems with their details
        const solvedProblems = new Map();
        
        submissions.forEach(submission => {
            // Only count problems where verdict is "OK" (accepted)
            if (submission.verdict === "OK") {
                const problemKey = `${submission.problem.contestId}-${submission.problem.index}`;
                
                // Only add unique problems
                if (!solvedProblems.has(problemKey)) {
                    solvedProblems.set(problemKey, {
                        name: submission.problem.name,
                        rating: submission.problem.rating, // This is the difficulty rating
                        tags: submission.problem.tags,
                        contestId: submission.problem.contestId,
                        index: submission.problem.index
                    });
                }
            }
        });
        
        // Convert Map to Array
        const uniqueSolvedProblems = Array.from(solvedProblems.values());
        
        res.json(uniqueSolvedProblems);
    } catch (error) {
        console.error("Error fetching solved problems:", error.message);
        res.status(500).json({ error: "Failed to fetch solved problems" });
    }
});


// ✅ Fetch user data from MongoDB(For profile page)
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


// Route to fetch rating history for a user
router.get("/rating-history/:handle", authMiddleware, async (req, res) => {
    try {
        const { handle } = req.params;
        
        if (!handle) {
            return res.status(400).json({ error: "Codeforces handle is required" });
        }
        
        // Fetch rating history from Codeforces API
        const response = await axios.get(`https://codeforces.com/api/user.rating?handle=${handle}`);
        
        // Check if the API response is successful
        if (response.data.status !== "OK") {
            return res.status(400).json({ error: "Failed to fetch rating data from Codeforces" });
        }
        
        // Extract the rating history from the response
        const ratingHistory = response.data.result;
        
        res.json(ratingHistory);
    } catch (error) {
        console.error("Error fetching rating history:", error.message);
        res.status(500).json({ error: "Failed to fetch rating history" });
    }
});

module.exports = router;
