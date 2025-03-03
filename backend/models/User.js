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
    name: { type: String, default: null },
    institution: { type: String, default: null },
    country: { type: String, default: null },
    codeforcesHandle: { type: String, sparse: true, default: null },
    rating: { type: Number, default: null },
    rank: { type: String, default: null },
    maxRating: { type: Number, default: null },
    maxRank: { type: String, default: null }
});

module.exports = mongoose.model("User", UserSchema);
