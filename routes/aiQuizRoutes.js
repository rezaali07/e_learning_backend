const express = require("express");
const {
  generateAiQuiz,
  getAiQuizByLesson,
  submitAiQuizScore,
  getUserQuizAttempts,
  submitAiQuizAttempt,
} = require("../controller/aiQuizController");

const { isAuthenticatedUser } = require("../middleware/auth");

const router = express.Router();

// Generate quiz for a lesson
router.post("/generate", isAuthenticatedUser, generateAiQuiz);

// Get quiz by lesson ID
router.get("/:lessonId", isAuthenticatedUser, getAiQuizByLesson);

// Submit quiz answers
router.post("/submit", isAuthenticatedUser, submitAiQuizScore);

// Get user's quiz history
router.get("/my-attempts", isAuthenticatedUser, getUserQuizAttempts);

module.exports = router;
