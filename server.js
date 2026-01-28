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
    content:
      "You are a study assistant. Generate 5-15 active recall questions based on the provided text.",
  },
  {
    role: "user",
    content: text,
  },
];

const parseQuestions = (content) => {
  if (!content) {
    return [];
  }

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string" && item.trim());
    }
    if (parsed && Array.isArray(parsed.questions)) {
      return parsed.questions.filter((item) => typeof item === "string" && item.trim());
    }
  } catch (error) {
    // Fall back to line parsing if JSON parse fails.
  }

  return content
    .split("\n")
    .map((line) => line.replace(/^\d+[\).\s-]+/, "").trim())
    .filter(Boolean);
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
                items: { type: "string" },
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
    return res.json({ questions: questions.slice(0, 15) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "LLM request failed." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
