const express = require("express");
const axios = require("axios");
const router = express.Router();
const User = require("../models/User");
const { linkCodeforces } = require("../controllers/codeforcesController");
const authMiddleware = require("../middleware/authMiddleware");
const { getProblems, getUserSolved, updateCodeforcesHandle } = require('../controllers/codeforcesController');
// Route for linking Codeforces handle (now protected with middleware)
router.post("/link", authMiddleware, linkCodeforces);
router.get('/problems', getProblems);

// Protected routes
router.get('/user/solved-problems', getUserSolved);
router.post('/user/update-handle', authMiddleware, updateCodeforcesHandle);

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

// Route to fetch problem tags distribution for a user
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
// Route to fetch weak topics with weighted scoring and Bayesian smoothing
router.get("/weak-topics/:handle", authMiddleware, async (req, res) => {
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
        
        // Process the submissions to get weak topics
        const submissions = response.data.result;
        
        // Track submissions for each tag
        const tagSubmissions = {};
        
        // Process each submission
        submissions.forEach(submission => {
            // Tag each problem with its tags
            submission.problem.tags.forEach(tag => {
                if (!tagSubmissions[tag]) {
                    tagSubmissions[tag] = {
                        totalSubmissions: 0,
                        wrongSubmissions: 0
                    };
                }
                
                // Increment total submissions for the tag
                tagSubmissions[tag].totalSubmissions++;
                
                // Increment wrong submissions if submission is not OK
                if (submission.verdict !== "OK") {
                    tagSubmissions[tag].wrongSubmissions++;
                }
            });
        });
        
        // Calculate final scores for weak topics
        const weakTopics = Object.keys(tagSubmissions)
            .map(tag => {
                const { totalSubmissions, wrongSubmissions } = tagSubmissions[tag];
                
                // Apply minimum submission threshold (ignore tags with fewer than 5 submissions)
                if (totalSubmissions < 5) {
                    return null;
                }
                
                // Calculate raw wrong submission percentage
                const rawWrongPercentage = (wrongSubmissions / totalSubmissions) * 100;
                
                // Apply Bayesian Smoothing and Weighted Scoring Formula
                // Final Score = ((W + 1) / (T + 2)) * log(1 + T)
                // W = Wrong Submissions
                // T = Total Submissions
                const finalScore = ((wrongSubmissions + 1) / (totalSubmissions + 2)) * Math.log(1 + totalSubmissions);
                
                return {
                    tag: tag,
                    totalSubmissions,
                    wrongSubmissions,
                    rawWrongPercentage: Number(rawWrongPercentage.toFixed(2)),
                    finalScore: Number(finalScore.toFixed(4))
                };
            })
            // Remove tags that didn't meet the submission threshold
            .filter(topic => topic !== null)
            // Sort by final score (descending)
            .sort((a, b) => b.finalScore - a.finalScore)
            // Take top 5 weak topics
            .slice(0, 5);
        
        res.json({
            weakTopics: weakTopics
        });
        
    } catch (error) {
        console.error("Error fetching weak topics:", error.message);
        res.status(500).json({ error: "Failed to fetch weak topics" });
    }
});

// Route to fetch recent contest history for a user
router.get("/contest-history/:handle", authMiddleware, async (req, res) => {
    try {
        const { handle } = req.params;

        if (!handle) {
            return res.status(400).json({ error: "Codeforces handle is required" });
        }

        // Fetch contest history from Codeforces API
        const response = await axios.get(`https://codeforces.com/api/user.rating?handle=${handle}`);

        if (response.data.status !== "OK") {
            return res.status(400).json({ error: "Failed to fetch contest data from Codeforces" });
        }

        // Extract contest history and sort by most recent
        const contestHistory = response.data.result
            .sort((a, b) => b.ratingUpdateTimeSeconds - a.ratingUpdateTimeSeconds)
            .slice(0, 10)
            .map(contest => ({
                contestName: contest.contestName,
                date: new Date(contest.ratingUpdateTimeSeconds * 1000).toISOString().split('T')[0],
                rank: contest.rank,
                ratingChange: contest.newRating - contest.oldRating,
                newRating: contest.newRating
            }));

        res.json({ success: true, contests: contestHistory });

    } catch (error) {
        console.error("Error fetching contest history:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch contest history" });
    }
});

// Route to fetch upcoming Codeforces contests
router.get("/upcoming-contests", authMiddleware, async (req, res) => {
    try {
        // Fetch contests from Codeforces API
        const response = await axios.get('https://codeforces.com/api/contest.list');

        // Check if the API response is successful
        if (response.data.status !== "OK") {
            return res.status(400).json({ error: "Failed to fetch contests from Codeforces" });
        }

        // First, slice to get the first 10 contests
        const first10Contests = response.data.result.slice(0, 10);

        // Now filter these 10 contests to find upcoming ones
        const upcomingContests = first10Contests
            .filter(contest => {
                // Convert start time to current time difference
                const currentTime = Math.floor(Date.now() / 1000);
                const startTime = contest.startTimeSeconds;

                // Conditions for an upcoming contest:
                // 1. Phase is 'BEFORE' (contest hasn't started)
                // 2. Start time is in the future
                // 3. Not a gym contest
                return (
                    contest.phase === 'BEFORE' && 
                    startTime > currentTime && 
                    contest.type !== 'GYM'
                );
            })
            .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
            .map(contest => ({
                id: contest.id,
                name: contest.name,
                type: contest.type,
                phase: contest.phase,
                duration: contest.durationSeconds,
                startTime: new Date(contest.startTimeSeconds * 1000).toISOString(),
                relativeTimeSeconds: contest.relativeTimeSeconds
            }));

        res.json({
            success: true,
            totalContests: upcomingContests.length,
            contests: upcomingContests
        });

    } catch (error) {
        console.error("Error fetching upcoming contests:", error.message);
        res.status(500).json({ 
            success: false, 
            error: "Failed to fetch upcoming contests",
            details: error.message 
        });
    }
});




module.exports = router;