const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static("."));

const buildPrompt = (text) => [
  {
    role: "system",
    content: `You are a study assistant helping students understand academic papers and technical texts. Generate 5-15 questions based on the provided text.

Focus on:
- Main arguments and key takeaways
- Core concepts and their relationships
- The "big picture" and why it matters
- Practical implications or applications

Avoid:
- Highly technical minutiae or specific numbers/statistics
- Jargon-heavy questions that test vocabulary rather than understanding
- Minor details that don't support the main ideas

Create a mix of question types:
- About half should be open-ended recall questions (type: "open")
- About half should be multiple choice questions (type: "multiple_choice") with exactly 4 options and one correct answer

For multiple choice questions, make the distractors plausible but clearly incorrect to someone who understood the material. Vary the position of the correct answer.`,
  },
  {
    role: "user",
    content: text,
  },
];

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const parseQuestions = (content) => {
  if (!content) {
    return [];
  }

  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.questions)) {
      return parsed.questions.filter((item) => {
        if (!item || !item.type || !item.question) return false;
        if (item.type === "open") return true;
        if (item.type === "multiple_choice") {
          return item.options && item.options.length === 4 && item.correctAnswer;
        }
        return false;
      });
    }
  } catch (error) {
    // Fall back to empty array if JSON parse fails.
  }

  return [];
};

const requestQuestions = async (text) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: buildPrompt(text),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "question_list",
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["open", "multiple_choice"],
                    },
                    question: { type: "string" },
                    options: {
                      type: "array",
                      items: { type: "string" },
                    },
                    correctAnswer: { type: "string" },
                  },
                  required: ["type", "question"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || "";
  return parseQuestions(content);
};

app.post("/api/questions", async (req, res) => {
  const text = (req.body?.text || "").trim();

  if (!text) {
    return res.status(400).json({ error: "Text is required." });
  }

  try {
    const questions = await requestQuestions(text);
    if (!questions.length) {
      return res.status(502).json({ error: "No questions returned from the LLM." });
    }
    return res.json({ questions: shuffleArray(questions).slice(0, 15) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "LLM request failed." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
