require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const codeforcesRoutes = require("./routes/codeforces"); // Import Codeforces routes
const profileRoutes = require("./routes/profile"); // Import profile routes

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/codeforces", codeforcesRoutes); // Register Codeforces route
app.use("/api/profile", profileRoutes); // Register profile route

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

