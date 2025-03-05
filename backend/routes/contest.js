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

module.exports = router;