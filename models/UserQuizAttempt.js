const mongoose = require("mongoose");

const UserQuizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  aiQuiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AiQuiz",
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  answersGiven: [
    {
      questionId: mongoose.Schema.Types.ObjectId, // optional, if questions have _id
      selectedOption: String, // e.g. "A"
    },
  ],
  attemptedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("UserQuizAttempt", UserQuizAttemptSchema);
