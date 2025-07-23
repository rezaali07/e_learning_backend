const express = require("express");
const router = express.Router();
const { summarizeLesson, askAiQuestion } = require("../controller/aiController");

router.post("/summarize", summarizeLesson);
router.post("/ask", askAiQuestion);


module.exports = router;
