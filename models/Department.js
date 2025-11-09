import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
    description: String,
    link: String,
    type: {
        type: String,
        enum: ["pdf", "video", "image", "link"],
        default: "link",
    },
});

const subjectSchema = new mongoose.Schema({
    name: String,
    resources: [resourceSchema],
});

const yearSchema = new mongoose.Schema({
    year: Number,
    subjects: [subjectSchema],
});

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    years: [yearSchema],
});

export default mongoose.model("Department", departmentSchema);
