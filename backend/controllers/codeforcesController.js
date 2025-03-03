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

module.exports = { linkCodeforces };
