const express = require("express");
const router = express.Router();
const Department = require("../models/Department");

// GET all departments
router.get("/", async (req, res) => {
    const departments = await Department.find();
    res.render("admin/departments", { departments });
});

// ADD department
router.post("/add", async (req, res) => {
    const { name } = req.body;
    if (name && name.trim()) {
        await Department.create({ name: name.trim() });
    }
    res.redirect("/departments");
});

// ADD year
router.post("/:depId/addYear", async (req, res) => {
    const { year } = req.body;
    const dep = await Department.findById(req.params.depId);
    if (dep) {
        dep.years.push({ year });
        await dep.save();
    }
    res.redirect("/departments");
});

// ADD subject
router.post("/:depId/years/:yearId/addSubject", async (req, res) => {
    const { name } = req.body;
    const dep = await Department.findById(req.params.depId);
    const year = dep.years.id(req.params.yearId);
    if (year) {
        year.subjects.push({ name });
        await dep.save();
    }
    res.redirect("/departments");
});

// ADD resource
router.post(
    "/:depId/years/:yearId/subjects/:subId/addResource",
    async (req, res) => {
        const { description, link, type } = req.body;
        const dep = await Department.findById(req.params.depId);
        const year = dep.years.id(req.params.yearId);
        const subject = year.subjects.id(req.params.subId);
        if (subject) {
            subject.resources.push({ description, link, type });
            await dep.save();
        }
        res.redirect("/departments");
    }
);

module.exports = router;
