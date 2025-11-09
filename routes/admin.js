import express from "express";
import bcrypt from "bcrypt";
import Department from "../models/Department.js";
import User from "../models/User.js";

const router = express.Router();

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.redirect("/");
    }
    next();
};

// ✅ Admin Dashboard
router.get("/dashboard", isAdmin, (req, res) => {
    res.render("admin/dashboard", { user: req.session.user });
});

// ✅ View Academic Structure
router.get("/academics", isAdmin, async (req, res) => {
    try {
        const departments = await Department.find().lean();
        res.render("admin/academics", {
            user: req.session.user,
            departments: departments || [],
        });
    } catch (err) {
        console.error("❌ Error loading academics:", err);
        res.status(500).send("Error loading academic structure.");
    }
});

// ✅ Add Department
router.post("/academics/addDepartment", isAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        if (name && name.trim()) {
            await Department.create({ name: name.trim() });
        }
        res.redirect("/admin/academics");
    } catch (err) {
        console.error("Error adding department:", err);
        res.status(500).send("Error adding department");
    }
});

// ✅ Add Year
router.post("/academics/:depId/addYear", isAdmin, async (req, res) => {
    try {
        const { year } = req.body;
        const dep = await Department.findById(req.params.depId);
        if (dep) {
            dep.years.push({ year, subjects: [] });
            await dep.save();
        }
        res.redirect("/admin/academics");
    } catch (err) {
        console.error("Error adding year:", err);
        res.status(500).send("Error adding year");
    }
});

// ✅ Add Subject
router.post(
    "/academics/:depId/years/:yearId/addSubject",
    isAdmin,
    async (req, res) => {
        try {
            const { name } = req.body;
            const dep = await Department.findById(req.params.depId);
            if (dep) {
                const year = dep.years.id(req.params.yearId);
                if (year) {
                    year.subjects.push({ name, resources: [] });
                    await dep.save();
                }
            }
            res.redirect("/admin/academics");
        } catch (err) {
            console.error("Error adding subject:", err);
            res.status(500).send("Error adding subject");
        }
    }
);

// ✅ Add Resource
router.post(
    "/academics/:depId/years/:yearId/subjects/:subId/addResource",
    isAdmin,
    async (req, res) => {
        try {
            const { description, link, type } = req.body;
            const dep = await Department.findById(req.params.depId);
            if (dep) {
                const year = dep.years.id(req.params.yearId);
                const subject = year.subjects.id(req.params.subId);
                if (subject) {
                    subject.resources.push({ description, link, type });
                    await dep.save();
                }
            }
            res.redirect("/admin/academics");
        } catch (err) {
            console.error("Error adding resource:", err);
            res.status(500).send("Error adding resource");
        }
    }
);

// 🗑️ Delete Department
router.delete("/academics/:depId", isAdmin, async (req, res) => {
    try {
        const result = await Department.findByIdAndDelete(req.params.depId);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Department not found",
            });
        }
        res.json({ success: true, message: "Department deleted successfully" });
    } catch (err) {
        console.error("Error deleting department:", err);
        res.status(500).json({
            success: false,
            message: "Error deleting department",
        });
    }
});

// 🗑️ Delete Year
router.delete("/academics/:depId/years/:yearId", isAdmin, async (req, res) => {
    try {
        const dep = await Department.findById(req.params.depId);
        if (!dep) {
            return res.status(404).json({
                success: false,
                message: "Department not found",
            });
        }

        const year = dep.years.id(req.params.yearId);
        if (!year) {
            return res.status(404).json({
                success: false,
                message: "Year not found",
            });
        }

        year.deleteOne();
        await dep.save();

        res.json({ success: true, message: "Year deleted successfully" });
    } catch (err) {
        console.error("Error deleting year:", err);
        res.status(500).json({
            success: false,
            message: "Error deleting year",
        });
    }
});

// 🗑️ Delete Subject
router.delete(
    "/academics/:depId/years/:yearId/subjects/:subId",
    isAdmin,
    async (req, res) => {
        try {
            const dep = await Department.findById(req.params.depId);
            if (!dep) {
                return res.status(404).json({
                    success: false,
                    message: "Department not found",
                });
            }

            const year = dep.years.id(req.params.yearId);
            if (!year) {
                return res.status(404).json({
                    success: false,
                    message: "Year not found",
                });
            }

            const subject = year.subjects.id(req.params.subId);
            if (!subject) {
                return res.status(404).json({
                    success: false,
                    message: "Subject not found",
                });
            }

            subject.deleteOne();
            await dep.save();

            res.json({
                success: true,
                message: "Subject deleted successfully",
            });
        } catch (err) {
            console.error("Error deleting subject:", err);
            res.status(500).json({
                success: false,
                message: "Error deleting subject",
            });
        }
    }
);

// 🗑️ Delete Resource
router.delete(
    "/academics/:depId/years/:yearId/subjects/:subId/resources/:resourceId",
    isAdmin,
    async (req, res) => {
        try {
            const dep = await Department.findById(req.params.depId);
            if (!dep) {
                return res.status(404).json({
                    success: false,
                    message: "Department not found",
                });
            }

            const year = dep.years.id(req.params.yearId);
            if (!year) {
                return res.status(404).json({
                    success: false,
                    message: "Year not found",
                });
            }

            const subject = year.subjects.id(req.params.subId);
            if (!subject) {
                return res.status(404).json({
                    success: false,
                    message: "Subject not found",
                });
            }

            const resource = subject.resources.id(req.params.resourceId);
            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: "Resource not found",
                });
            }

            resource.deleteOne();
            await dep.save();

            res.json({
                success: true,
                message: "Resource deleted successfully",
            });
        } catch (err) {
            console.error("Error deleting resource:", err);
            res.status(500).json({
                success: false,
                message: "Error deleting resource",
            });
        }
    }
);

// ✅ Manage Students
router.get("/students", isAdmin, async (req, res) => {
    const students = await User.find({ role: "student" });
    res.render("admin/students", { students });
});

// ✅ Manage Faculty
router.get("/faculty", isAdmin, async (req, res) => {
    const faculty = await User.find({ role: "admin" });
    res.render("admin/faculties", { faculty });
});

// ✅ Add new faculty/admin
router.post("/addUser", isAdmin, async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res
                .status(400)
                .json({ message: "Email already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            email,
            password: hashedPassword,
            name,
            role,
        });
        await newUser.save();

        res.status(201).json({ message: "User added successfully!", newUser });
    } catch (err) {
        console.error("Error adding user:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ✅ Delete user
router.delete("/deleteUser", isAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        const result = await User.deleteOne({ email });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully!" });
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
