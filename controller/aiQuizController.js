const axios = require("axios");
const AiQuiz = require("../models/AiQuiz");
const UserQuizAttempt = require("../models/UserQuizAttempt");


// const MAX_RETRIES = 3;

// async function generateQuizWithRetry(lessonText, lessonId, retries = 0) {
//   const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

//   const prompt = `
// You are an expert quiz generator.
// Generate exactly 4 multiple choice questions based on the lesson content below.
// Each question should have 4 options labeled A, B, C, D.
// Specify the correct answer as a single letter (A/B/C/D).
// Return ONLY a JSON object with a "questions" array.
// Each question must have:
// - "question": string
// - "options": { "A": "...", "B": "...", "C": "...", "D": "..." }
// - "answer": "A" | "B" | "C" | "D"

// Lesson content:
// """${lessonText}"""
// `;

//   const response = await axios.post(
//     "https://openrouter.ai/api/v1/chat/completions",
//     {
//       model: "deepseek/deepseek-r1-0528-qwen3-8b",
//       messages: [{ role: "user", content: prompt }],
//       max_tokens: 1500,
//       temperature: 0.7,
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${OPENROUTER_API_KEY}`,
//         "Content-Type": "application/json",
//       },
//     }
//   );

//   const rawText = response.data.choices[0].message.content;

//   // Clean markdown code fences
//   const cleaned = rawText.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();

//   // Extract JSON substring safely
//   const firstBrace = cleaned.indexOf('{');
//   const lastBrace = cleaned.lastIndexOf('}');

//   if (firstBrace === -1 || lastBrace === -1) {
//     throw new Error("No JSON object found in AI response");
//   }

//   const jsonString = cleaned.substring(firstBrace, lastBrace + 1);

//   try {
//     return JSON.parse(jsonString);
//   } catch (err) {
//     if (retries < MAX_RETRIES) {
//       console.warn(`JSON parse error, retrying... (${retries + 1})`);
//       return generateQuizWithRetry(lessonText, lessonId, retries + 1);
//     } else {
//       throw err;
//     }
//   }
// }

// // Usage in your controller:
// exports.generateAiQuiz = async (req, res) => {
//   const { lessonId, lessonText } = req.body;

//   if (!lessonId || !lessonText) {
//     return res.status(400).json({ error: "lessonId and lessonText are required" });
//   }

//   try {
//     const quizData = await generateQuizWithRetry(lessonText, lessonId);

//     if (!quizData?.questions) {
//       return res.status(500).json({ error: "Invalid quiz data format from AI" });
//     }

//     let existingQuiz = await AiQuiz.findOne({ lesson: lessonId });
//     if (existingQuiz) {
//       existingQuiz.questions = quizData.questions;
//       await existingQuiz.save();
//       return res.status(200).json({ quiz: existingQuiz });
//     }

//     const newQuiz = new AiQuiz({
//       lesson: lessonId,
//       questions: quizData.questions,
//     });
//     await newQuiz.save();

//     res.status(201).json({ quiz: newQuiz });
//   } catch (error) {
//     console.error("OpenRouter quiz generation error:", error.message || error);
//     res.status(500).json({ error: "Failed to generate quiz using AI model" });
//   }
// };


// Generate AI Quiz using Mistral
exports.generateAiQuiz = async (req, res) => {
  const { lessonId, lessonText } = req.body;

  if (!lessonId || !lessonText) {
    return res.status(400).json({ error: "lessonId and lessonText are required" });
  }

  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "OpenRouter API key not configured" });
    }

    // Prompt for MCQ generation
    const prompt = `
You are an expert quiz generator.
Create exactly 4 multiple-choice questions based on the lesson below.
Each question must have 4 options labeled A, B, C, D.
Return ONLY a valid JSON object in this format:

{
  "questions": [
    {
      "question": "Your question here?",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "answer": "A"
    },
    ...
  ]
}

Lesson:
"""${lessonText}"""
`;

    // Request to OpenRouter with Mistral
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let content = response.data.choices[0].message.content.trim();

    // Clean code block wrapping if exists
    if (content.startsWith("```json")) {
      content = content.replace(/^```json/, "").replace(/```$/, "").trim();
    }

    let quizData;
    try {
      quizData = JSON.parse(content);
    } catch (err) {
      console.error("❌ JSON parse error:", err);
      return res.status(500).json({ error: "Failed to parse quiz data from AI response" });
    }

    // Save or update quiz in DB
    let existingQuiz = await AiQuiz.findOne({ lesson: lessonId });
    if (existingQuiz) {
      existingQuiz.questions = quizData.questions;
      await existingQuiz.save();
      return res.status(200).json({ quiz: existingQuiz });
    }

    const newQuiz = new AiQuiz({
      lesson: lessonId,
      questions: quizData.questions,
    });

    await newQuiz.save();
    res.status(201).json({ quiz: newQuiz });
  } catch (error) {
    console.error("🚨 OpenRouter quiz generation error:", error.message || error);
    res.status(500).json({ error: "Failed to generate quiz using AI model" });
  }
};



// Submit user quiz answers & save score
exports.submitAiQuizAttempt = async (req, res) => {
    const userId = req.user._id; // from auth middleware
    const { aiQuizId, answers } = req.body; // answers: [{ questionIndex: 0, selectedOption: "A" }, ...]

    if (!aiQuizId || !answers) {
        return res.status(400).json({ error: "aiQuizId and answers are required" });
    }

    try {
        const aiQuiz = await AiQuiz.findById(aiQuizId);
        if (!aiQuiz) {
            return res.status(404).json({ error: "AI Quiz not found" });
        }

        // Calculate score
        let score = 0;
        answers.forEach(({ questionIndex, selectedOption }) => {
            const correctAnswer = aiQuiz.questions[questionIndex]?.answer;
            if (correctAnswer && selectedOption === correctAnswer) {
                score += 1;
            }
        });

        const userAttempt = new UserQuizAttempt({
            user: userId,
            aiQuiz: aiQuizId,
            score,
            totalQuestions: aiQuiz.questions.length,
            answersGiven: answers.map(({ questionIndex, selectedOption }) => ({
                questionId: aiQuiz.questions[questionIndex]?._id || null,
                selectedOption,
            })),
        });

        await userAttempt.save();

        res.json({
            message: "Quiz submitted successfully",
            score,
            totalQuestions: aiQuiz.questions.length,
        });
    } catch (error) {
        console.error("Submit AI quiz attempt error:", error);
        res.status(500).json({ error: "Failed to submit quiz attempt" });
    }
};

// Get all quiz attempts by user
exports.getUserQuizAttempts = async (req, res) => {
    const userId = req.user._id;
    try {
        const attempts = await UserQuizAttempt.find({ user: userId })
            .populate({ path: "aiQuiz", select: "lesson questions" })
            .sort({ attemptedAt: -1 });

        res.json({ attempts });
    } catch (error) {
        console.error("Get user quiz attempts error:", error);
        res.status(500).json({ error: "Failed to fetch quiz attempts" });
    }
};


exports.submitAiQuizScore = async (req, res) => {
    try {
        const { quizId, score, total } = req.body;

        if (!quizId || score == null || total == null) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const userId = req.user.id;

        // Store it in a DB (You should define QuizResult model)
        const result = await QuizResult.create({
            user: userId,
            quiz: quizId,
            score,
            total,
        });

        res.status(200).json({ message: "Score submitted", result });
    } catch (error) {
        console.error("Submit AI quiz score error:", error);
        res.status(500).json({ message: "Server error submitting score" });
    }
};


exports.getAiQuizScores = async (req, res) => {
    const userId = req.user._id;
    try {
        const attempts = await UserQuizAttempt.find({ user: userId })
            .populate({ path: "aiQuiz", select: "lesson questions" })
            .sort({ attemptedAt: -1 });

        res.json({ attempts });
    } catch (error) {
        console.error("Get user quiz attempts error:", error);
        res.status(500).json({ error: "Failed to fetch quiz attempts" });
    }
};

exports.getAiQuizByLesson = async (req, res) => {
    const { lessonId } = req.params;

    try {
        const quiz = await AiQuiz.findOne({ lesson: lessonId });
        if (!quiz) {
            return res.status(404).json({ error: "AI Quiz not found for this lesson" });
        }
        res.json({ quiz });
    } catch (error) {
        console.error("Get AI quiz error:", error);
        res.status(500).json({ error: "Failed to fetch AI quiz" });
    }
};
