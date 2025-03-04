const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const axios = require("axios");

router.post("/common-contests", authMiddleware, async (req, res) => {
    try {
        const { friendHandle } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) return res.status(404).json({ error: "User not found" });

        console.log(`Fetching contests for ${user.codeforcesHandle} and ${friendHandle}`);

        // Fetch contests for both users
        const userRatingResponse = await axios.get(`https://codeforces.com/api/user.rating?handle=${user.codeforcesHandle}`);
        const friendRatingResponse = await axios.get(`https://codeforces.com/api/user.rating?handle=${friendHandle}`);

        const userContests = new Set(userRatingResponse.data.result.map(c => c.contestId));
        const friendContests = new Set(friendRatingResponse.data.result.map(c => c.contestId));

        // Find common contest IDs
        const commonContestIds = [...userContests].filter(id => friendContests.has(id));

        console.log("Common contests:", commonContestIds);
        res.json(commonContestIds.map(id => ({ contestId: id })));
    } catch (error) {
        console.error("Error fetching common contests:", error);
        res.status(500).json({ error: "Failed to fetch contest data" });
    }
});


router.get("/contest-standings", authMiddleware, async (req, res) => {
    try {
        const { contestId, handles } = req.query;

        const contestResponse = await axios.get(
            `https://codeforces.com/api/contest.standings?contestId=${contestId}&handles=${handles}`
        );

        res.json(contestResponse.data.result);
    } catch (error) {
        console.error("Error fetching contest standings:", error);
        res.status(500).json({ error: "Failed to fetch contest standings" });
    }
});



module.exports = router;