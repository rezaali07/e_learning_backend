const mongoose = require("mongoose");

const AiQuizSchema = new mongoose.Schema({
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
        required: true,
        unique: true, // one AI quiz per lesson
    },
    questions: [
        {
            question: String,
            options: {
                A: String,
                B: String,
                C: String,
                D: String,
            },
            answer: String, // Correct option letter, e.g. "B"
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("AiQuiz", AiQuizSchema);
