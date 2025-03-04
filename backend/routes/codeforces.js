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

// NEW ENDPOINT: Route to fetch problem tags distribution for a user
router.get("/problem-tags/:handle", authMiddleware, async (req, res) => {
    try {
        const { handle } = req.params;
        
        if (!handle) {
            return res.status(400).json({ error: "Codeforces handle is required" });
        }
        
        // Fetch user submissions from Codeforces API
        const response = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}`);
        
        // Check if the API response is successful
        if (response.data.status !== "OK") {
            return res.status(400).json({ error: "Failed to fetch submission data from Codeforces" });
        }
        
        // Process the submissions to get problem tags distribution
        const submissions = response.data.result;
        
        // Track unique solved problems by problem ID to avoid counting the same problem multiple times
        const solvedProblems = new Map();
        
        // Process each submission
        submissions.forEach(submission => {
            // Only count successful submissions (Accepted verdict)
            if (submission.verdict === "OK") {
                const problemId = `${submission.problem.contestId}-${submission.problem.index}`;
                
                // If we haven't processed this problem yet, add it
                if (!solvedProblems.has(problemId)) {
                    // Store the problem with its tags
                    solvedProblems.set(problemId, submission.problem.tags);
                }
            }
        });
        
        // Count occurrences of each tag
        const tagCounts = {};
        
        // Count each tag from each unique solved problem
        solvedProblems.forEach((tags) => {
            tags.forEach(tag => {
                if (!tagCounts[tag]) {
                    tagCounts[tag] = 0;
                }
                tagCounts[tag]++;
            });
        });
        
        // Convert to array of objects for easier frontend processing
        const tagsArray = Object.keys(tagCounts).map(tag => ({
            tag: tag,
            count: tagCounts[tag]
        }));
        
        // Sort by count (descending)
        tagsArray.sort((a, b) => b.count - a.count);
        
        // Get the total number of unique solved problems
        const totalSolvedProblems = solvedProblems.size;
        
        res.json({
            totalSolvedProblems,
            tags: tagsArray
        });
        
    } catch (error) {
        console.error("Error fetching problem tags:", error.message);
        res.status(500).json({ error: "Failed to fetch problem tags distribution" });
    }
});

// Route to fetch submission verdict statistics for a user
router.get("/submission-verdicts/:handle", authMiddleware, async (req, res) => {
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
        
        // Count occurrences of each verdict
        const verdictCounts = {};
        
        submissions.forEach(submission => {
            const verdict = submission.verdict;
            if (!verdictCounts[verdict]) {
                verdictCounts[verdict] = 0;
            }
            verdictCounts[verdict]++;
        });
        
        // Convert to array format for the frontend
        const verdicts = Object.keys(verdictCounts).map(verdict => ({
            verdict: verdict,
            count: verdictCounts[verdict]
        }));
        
        res.json({
            totalSubmissions: submissions.length,
            verdicts: verdicts
        });
        
    } catch (error) {
        console.error("Error fetching submission verdicts:", error.message);
        res.status(500).json({ error: "Failed to fetch submission verdicts" });
    }
});

// Route to fetch submission activity data for heatmap
router.get("/submission-activity/:handle", authMiddleware, async (req, res) => {
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
        
        // Process submissions to get activity by date
        const activityByDate = {};
        
        // Get current date and calculate date 1 year ago
        const currentDate = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(currentDate.getFullYear() - 1);
        
        // Initialize all dates in the past year with 0 submissions
        for (let d = new Date(oneYearAgo); d <= currentDate; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            activityByDate[dateKey] = 0;
        }
        
        // Count submissions for each date
        submissions.forEach(submission => {
            const submissionDate = new Date(submission.creationTimeSeconds * 1000);
            // Only count submissions from the last year
            if (submissionDate >= oneYearAgo) {
                const dateKey = submissionDate.toISOString().split('T')[0];
                if (activityByDate[dateKey] !== undefined) {
                    activityByDate[dateKey]++;
                }
            }
        });
        
        // Convert to array format for the frontend
        const activityData = Object.keys(activityByDate).map(date => ({
            date: date,
            count: activityByDate[date]
        }));
        
        // Sort by date
        activityData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        res.json({
            totalSubmissions: submissions.length,
            activity: activityData
        });
        
    } catch (error) {
        console.error("Error fetching submission activity:", error.message);
        res.status(500).json({ error: "Failed to fetch submission activity" });
    }
});

module.exports = router;