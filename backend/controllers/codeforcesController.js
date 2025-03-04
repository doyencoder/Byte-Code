const User = require("../models/User");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// Controller to link Codeforces handle
const linkCodeforces = async (req, res) => {
    try {
        const token = req.header("Authorization");
        const { codeforcesHandle } = req.body;

        if (!token || !codeforcesHandle) {
            return res.status(400).json({ message: "Token and Codeforces handle are required" });
        }

        // Extract userId from token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Fetch new user data from Codeforces API
        const response = await axios.get(`https://codeforces.com/api/user.info?handles=${codeforcesHandle}`);
        const userData = response.data.result[0];

        if (!userData) {
            return res.status(404).json({ message: "Invalid Codeforces handle" });
        }

        // Update user in MongoDB using userId
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    codeforcesHandle: codeforcesHandle.trim(), // Ensure handle is trimmed
                    rating: userData.rating,
                    rank: userData.rank,
                    maxRating: userData.maxRating,
                    maxRank: userData.maxRank,
                },
            },
            { new: true }
        );

        res.status(200).json({ message: "Codeforces handle updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Error in linkCodeforces:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update your controllers/codeforcesController.js file

const { fetchProblemsFromCodeforces, getUserSolvedProblems } = require('../utils/codeforcesAPI');
// const User = require('../models/User');
// If you have a Problem model, include it:
// const Problem = require('../models/Problem');

// Cache for problems to avoid excessive API calls
let problemsCache = null;
let lastFetchTime = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Get all problems
const getProblems = async (req, res) => {
    try {
        // Check if we need to refresh the cache
        const currentTime = Date.now();
        if (!problemsCache || !lastFetchTime || (currentTime - lastFetchTime > CACHE_DURATION)) {
            console.log('Fetching fresh problems from Codeforces...');
            problemsCache = await fetchProblemsFromCodeforces();
            lastFetchTime = currentTime;
            
            // If you want to save problems to database, uncomment these lines
            // await Problem.deleteMany({}); // Clear existing problems
            // await Problem.insertMany(problemsCache);
        } else {
            console.log('Using cached problems...');
        }
        
        res.json({ success: true, problems: problemsCache });
    } catch (error) {
        console.error('Error getting problems:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch problems' });
    }
};

// Get user's solved problems
const getUserSolved = async (req, res) => {
    try {
        const { email } = req.query; // Get email from frontend request

        if (!email) {
            return res.status(400).json({ success: false, error: "Email is required" });
        }

        // Fetch user from database using email
        const user = await User.findOne({ email });

        if (!user || !user.codeforcesHandle) {
            return res.status(404).json({ success: false, error: "Codeforces handle not found for this user" });
        }

        // Fetch solved problems from Codeforces
        const solvedProblems = await getUserSolvedProblems(user.codeforcesHandle);

        return res.json({ success: true, solvedProblems: Array.from(solvedProblems) });
    } catch (error) {
        console.error("Error getting solved problems:", error);
        return res.status(500).json({ success: false, error: "Failed to fetch solved problems" });
    }
};

// Update the user's Codeforces handle
const updateCodeforcesHandle = async (req, res) => {
    try {
        const { codeforcesHandle } = req.body;
        const userId = req.user.id; // Assuming you have authentication middleware
        
        if (!codeforcesHandle) {
            return res.status(400).json({ success: false, error: 'Codeforces handle is required' });
        }
        
        // Update user in database
        await User.findByIdAndUpdate(userId, { codeforcesHandle });
        
        res.json({ success: true, message: 'Codeforces handle updated successfully' });
    } catch (error) {
        console.error('Error updating Codeforces handle:', error);
        res.status(500).json({ success: false, error: 'Failed to update Codeforces handle' });
    }
};

module.exports = {
    getProblems,
    getUserSolved,
    updateCodeforcesHandle,
    linkCodeforces
};
