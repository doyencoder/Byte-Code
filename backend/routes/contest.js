const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const ContestAttempt = require("../models/ContestUser");
const User = require("../models/User"); // Import the User model
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Welcome route
router.get("/", authMiddleware, (req, res) => {
    res.json({ message: "Welcome to our Contest Page!", userId: req.user.id });
});

// Route to create a new contest attempt (used at contest start)
router.post("/save-attempt", authMiddleware, async (req, res) => {
    try {
        const userObjectId = new mongoose.Types.ObjectId(req.user.userId);
        const {
            problems,
            startTime,
            endTime,
            duration,
            status,
            totalProblems,
            solvedProblemsCount
        } = req.body;

        const newContestAttempt = new ContestAttempt({
            userId: userObjectId,
            problems,
            startTime,
            endTime,
            duration,
            status,
            totalProblems,
            solvedProblemsCount
        });

        const savedAttempt = await newContestAttempt.save();

        res.status(201).json({
            message: "Contest attempt saved successfully",
            contestAttempt: savedAttempt
        });
    } catch (error) {
        console.error('Error saving contest attempt:', error);
        res.status(500).json({ 
            message: 'Server error saving contest attempt',
            error: error.message 
        });
    }
});

// Fetch contest history route (unchanged)
router.get("/history", authMiddleware, async (req, res) => {
    try {
        const userObjectId = new mongoose.Types.ObjectId(req.user.userId);
        const contestHistory = await ContestAttempt.find({ 
            userId: userObjectId 
        }).sort({ startTime: -1 }); 
        res.json(contestHistory);
    } catch (error) {
        console.error('Error fetching contest history:', error);
        res.status(500).json({ 
            message: 'Server error fetching contest history',
            error: error.message 
        });
    }
});

// New route for calculating ratings
router.get("/ratings", authMiddleware, async (req, res) => {
    try {
        // Convert the string to a proper MongoDB ObjectId
        const userObjectId = new mongoose.Types.ObjectId(req.user.userId);

        // Find all contest attempts for the logged-in user
        const contestHistory = await ContestAttempt.find({ 
            userId: userObjectId 
        }).sort({ startTime: 1 }); 

        // If no contest history, return empty array
        if (contestHistory.length === 0) {
            return res.json([]);
        }

        // Initialize rating array with the first contest
        const ratingData = [];
        let currentRating = 100; // Start with initial rating of 100

        // Calculate ratings for each contest
        for (const contest of contestHistory) {
            const solvedProblems = contest.problems.filter(p => p.status === 'solved');
            
            // Calculate contest performance
            let contestPoints = 0;
            let totalProblemRating = 0;

            solvedProblems.forEach(problem => {
                const di = problem.rating || 0;
                const solveTime = problem.solvedAt ? new Date(problem.solvedAt) : null;
                const startTime = new Date(contest.startTime);
                
                // Calculate time in minutes
                const ti = solveTime ? Math.round((solveTime - startTime) / (1000 * 60)) : 0;
                const wi = problem.wrongSubmissionCount || 0;
                const totalDuration = contest.duration;

                // Calculate performance factor
                const performanceFactor = Math.max(0, 1 - (ti + 20 * wi) / totalDuration);
                
                // Calculate problem points
                const problemPoints = di * performanceFactor;
                contestPoints += problemPoints;
                totalProblemRating += di;
            });

            // Calculate rating adjustment
            const ratingAdjustment = totalProblemRating > 0 
                ? Math.round((contestPoints / totalProblemRating) * 100)
                : 0;

            // Update current rating
            currentRating += ratingAdjustment;

            // Store rating data
            ratingData.push({
                date: contest.startTime,
                rating: currentRating,
                points: ratingAdjustment
            });
        }

        res.json(ratingData);
    } catch (error) {
        console.error('Error calculating contest ratings:', error);
        res.status(500).json({ 
            message: 'Server error calculating contest ratings',
            error: error.message 
        });
    }
});

// Fetch contest problems from Codeforces
router.get("/fetch-problems", authMiddleware, async (req, res) => {
    try {
        // Expected query parameters: numQuestions and ratings (comma-separated)
        const { numQuestions, ratings } = req.query;
        const ratingsArray = ratings.split(",");

        // Get the user's Codeforces handle
        const user = await User.findById(req.user.userId);
        if (!user || !user.codeforcesHandle) {
            return res.status(400).json({ error: "Codeforces handle not found" });
        }
        const handle = user.codeforcesHandle;

        // Fetch the latest 1000 problems from Codeforces
        const problemsetResponse = await axios.get("https://codeforces.com/api/problemset.problems");
        let problems = problemsetResponse.data.result.problems.slice(0,1000);

        // Fetch user's solved problems
        const userStatusResponse = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=2000`);
        const solvedProblems = new Set(
            userStatusResponse.data.result
                .filter(submission => submission.verdict === "OK")
                .map(submission => `${submission.problem.contestId}${submission.problem.index}`)
        );

        // Filter out solved problems
        problems = problems.filter(problem => !solvedProblems.has(`${problem.contestId}${problem.index}`));

        // For each requested rating, randomly select one unsolved problem
        let selectedProblems = [];
        ratingsArray.forEach(rating => {
            let filtered = problems.filter(problem => problem.rating === parseInt(rating));
            if (filtered.length > 0) {
                selectedProblems.push(filtered[Math.floor(Math.random() * filtered.length)]);
            }
        });

        // Prepare response: include required fields and default status
        const responseProblems = selectedProblems.map(problem => ({
            contestId: problem.contestId,
            index: problem.index,
            name: problem.name,
            rating: problem.rating,
            link: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`,
            status: 'unsolved'
        }));

        res.json(responseProblems);
    } catch (error) {
        console.error("Error fetching problems:", error);
        res.status(500).json({ error: "Failed to fetch problems" });
    }
});

// Proxy route: fetch user status from Codeforces (avoids CORS issues)
router.get("/user-status", authMiddleware, async (req, res) => {
    try {
        const { handle } = req.query;
        const response = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=100`);
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching user status:", error);
        res.status(500).json({ error: "Failed to fetch user status" });
    }
});

// Route to update contest attempt problem statuses in the DB
router.post("/update-problem-status", authMiddleware, async (req, res) => {
    try {
        const { contestAttemptId, updatedProblems } = req.body;
        const contestAttempt = await ContestAttempt.findById(contestAttemptId);
        if (!contestAttempt) {
            return res.status(404).json({ error: "Contest attempt not found" });
        }
        // Replace the problems array with updatedProblems
        contestAttempt.problems = updatedProblems;
        // Update solvedProblemsCount and contest status if all problems are solved
        contestAttempt.solvedProblemsCount = updatedProblems.filter(p => p.status === 'solved').length;
        if (contestAttempt.solvedProblemsCount === contestAttempt.totalProblems) {
            contestAttempt.status = 'completed';
            contestAttempt.endTime = new Date();
        }
        await contestAttempt.save();
        res.json({ message: "Contest attempt updated", contestAttempt });
    } catch (error) {
        console.error("Error updating contest attempt:", error);
        res.status(500).json({ error: "Failed to update contest attempt" });
    }
});

module.exports = router;
