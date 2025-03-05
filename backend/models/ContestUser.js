const mongoose = require("mongoose");
const crypto = require('crypto');

const ContestAttemptSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
    problems: [{
        problemId: String,
        contestId: Number,
        index: String,
        rating: Number,
        link: String, // Add problem link
        wrongSubmissionCount: { type: Number, default: 0 },
        solvedAt: { type: Date, default: null },
        status: { 
            type: String, 
            enum: ['unsolved', 'attempted', 'solved'], 
            default: 'unsolved' 
        }
    }],
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date }, // Explicitly store end time
    duration: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['ongoing', 'completed', 'abandoned'], 
        default: 'ongoing' 
    },
    totalProblems: { type: Number, required: true },
    solvedProblemsCount: { type: Number, default: 0 }
});

module.exports = mongoose.model("ContestAttempt",ContestAttemptSchema);