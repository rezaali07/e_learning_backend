const axios = require("axios");


exports.summarizeLesson = async (req, res) => {
  const { lessonContent } = req.body;

  if (!lessonContent) {
    return res.status(400).json({ error: "Lesson content is required." });
  }

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-r1-0528-qwen3-8b",
        messages: [
          {
            role: "system",
            content: "You are an expert tutor who summarizes educational lesson content clearly and concisely.",
          },
          {
            role: "user",
            content: `Please summarize the following lesson:\n\n${lessonContent}`,
          },
        ],
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:4000", // Replace with your frontend URL if deployed
          "Content-Type": "application/json",
        },
      }
    );

    const summary = response.data.choices?.[0]?.message?.content?.trim() || "No summary available.";
    res.status(200).json({ summary });
  } catch (error) {
    console.error("OpenRouter summarization error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to summarize lesson." });
  }
};





exports.askAiQuestion = async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    const response = await axios.post(
  "https://openrouter.ai/api/v1/chat/completions",
  {
    model: "deepseek/deepseek-r1-0528-qwen3-8b",
    messages: [
      { role: "system", content: "You are a helpful AI tutor." },
      { role: "user", content: question }
    ],
    temperature: 0.7
  },
  {
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, // ✅ Make sure this env var exists
      "HTTP-Referer": "http://localhost:4000", // or your frontend domain
      "Content-Type": "application/json"
    }
  }
);


    const answer = response.data.choices?.[0]?.message?.content || "No answer.";
    res.status(200).json({ answer });

  } catch (err) {
    console.error("OpenRouter AI Chat Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to get AI response" });
  }
};
