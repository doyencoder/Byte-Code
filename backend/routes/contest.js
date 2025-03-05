const express = require("express");
const ContestAttempt = require("../models/ContestUser");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const mongoose = require("mongoose");

router.get("/", authMiddleware, (req, res) => {
    res.json({ message: "Welcome to our Contest Page!", userId: req.user.id });
});

// New route to fetch contest history
router.get("/history", authMiddleware, async (req, res) => {
    try {
        console.log("User ID from middleware:", req.user.userId);

        // Convert the string to a proper MongoDB ObjectId
        const userObjectId = new mongoose.Types.ObjectId(req.user.userId);

        // Log all documents in the collection to verify
        const allContestAttempts = await ContestAttempt.find({});
        console.log("All Contest Attempts:", allContestAttempts.map(attempt => ({
            _id: attempt._id,
            userId: attempt.userId,
            startTime: attempt.startTime
        })));

        // Find all contest attempts for the logged-in user
        const contestHistory = await ContestAttempt.find({ 
            userId: userObjectId 
        }).sort({ startTime: -1 }); 

        console.log("Matching Contest History:", contestHistory);

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

module.exports = router;