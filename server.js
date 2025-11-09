import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import session from "express-session";
import MongoStore from "connect-mongo";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bodyParser from "body-parser";

import User from "./models/User.js";
import adminRoutes from "./routes/admin.js";
import studentRoutes from "./routes/student.js";
import uploadRoutes from "./routes/upload.js";
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Sessions stored in MongoDB
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: "sessions",
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 2, // 2 hours
        },
    })
);

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ---------------- ROUTES ----------------

// Root (login page)
app.get("/", (req, res) => {
    if (req.session.user) {
        const { role } = req.session.user;
        if (role === "admin") return res.redirect("/admin/dashboard");
        if (role === "student") return res.redirect("/student/dashboard");
    }
    res.render("login");
});

// Login
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user)
            return res
                .status(400)
                .json({ success: false, message: "User not found" });

        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res
                .status(400)
                .json({ success: false, message: "Incorrect password" });

        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        };

        res.json({ success: true, role: user.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Server error during login",
        });
    }
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// Route Groups
app.use("/admin", adminRoutes);
app.use("/student", studentRoutes);
app.use("/upload", uploadRoutes);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    console.log(`🚀 Server running at http://localhost:${PORT}`)
);
