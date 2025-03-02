const User = require("../models/User");

// Controller to link Codeforces handle
const linkCodeforces = async (req, res) => {
    try {
        const { email, codeforcesHandle } = req.body;

        if (!email || !codeforcesHandle) {
            return res.status(400).json({ message: "Email and Codeforces handle are required" });
        }

        // Debugging logs
        console.log("Email received:", email);

        const user = await User.findOne({ email });
        console.log("User found:", user); // Debugging step
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.codeforcesHandle = codeforcesHandle.trim(); // ✅ Save the handle after trimming spaces
        await user.save();

        res.status(200).json({ message: "Codeforces handle linked successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { linkCodeforces };
