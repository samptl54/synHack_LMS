import express from "express";
import Department from "../models/Department.js";

const router = express.Router();

// Student dashboard
router.get("/dashboard", async (req, res) => {
    if (!req.session.user || req.session.user.role !== "student")
        return res.redirect("/");

    const departments = await Department.find()
        .populate({
            path: "years.subjects",
            populate: { path: "resources" },
        })
        .exec();

    res.render("student/dashboard", { user: req.session.user, departments });
});

export default router;
