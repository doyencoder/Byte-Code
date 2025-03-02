const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true, // ✅ Converts emails to lowercase before saving
        trim: true
    },
    password: { type: String, required: true },
    codeforcesHandle: { type: String, unique: true, sparse: true, default: null },
    rating: { type: Number, default: null },
    rank: { type: String, default: null },
    maxRating: { type: Number, default: null },
    maxRank: { type: String, default: null }
});

module.exports = mongoose.model("User", UserSchema);
