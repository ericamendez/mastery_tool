const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const buildPrompt = (text) => [
  {
    role: "system",
    content: `You are a study assistant helping students understand academic papers and technical texts. Generate 8-12 questions based on the provided text.

Focus on:
- Main arguments and key takeaways
- Core concepts and their relationships
- The "big picture" and why it matters
- Practical implications or applications

Avoid:
- Highly technical minutiae or specific numbers/statistics
- Jargon-heavy questions that test vocabulary rather than understanding
- Minor details that don't support the main ideas

Create a mix of question types randomly ordered:
- About half should be open-ended recall questions
- About half should be multiple choice questions with exactly 4 options (A, B, C, D) and one correct answer

Output as a JSON array of question objects. Each object has:
- "type": either "open" or "multiple_choice"
- "question": the question text
- "options": array of 4 strings (only for multiple_choice)
- "correctAnswer": the correct option text (only for multiple_choice)

For multiple choice questions, make distractors plausible but clearly wrong to someone who understood the material. Vary the position of the correct answer.`,
  },
  {
    role: "user",
    content: text,
  },
];

// Extract complete question objects from partial JSON
function extractCompleteQuestions(content) {
  const questions = [];

  // Find question objects using regex
  const questionPattern =
    /\{\s*"type"\s*:\s*"(open|multiple_choice)"[^{}]*?"question"\s*:\s*"[^"]*"[^{}]*?\}/g;

  let match;
  while ((match = questionPattern.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[0]);

      if (parsed.type && parsed.question) {
        if (parsed.type === "open") {
          questions.push(parsed);
        } else if (
          parsed.type === "multiple_choice" &&
          parsed.options &&
          parsed.options.length === 4 &&
          parsed.correctAnswer
        ) {
          questions.push(parsed);
        }
      }
    } catch (e) {
      // Object wasn't complete yet, skip it
    }
  }

  // Deduplicate based on question text
  const seen = new Set();
  return questions.filter((q) => {
    if (seen.has(q.question)) return false;
    seen.add(q.question);
    return true;
  });
}

app.post("/api/questions", async (req, res) => {
  const text = (req.body?.text || "").trim();

  if (!text) {
    return res.status(400).json({ error: "Text is required." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: buildPrompt(text),
        stream: true,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.write(
        `data: ${JSON.stringify({ error: `LLM request failed: ${errorText}` })}\n\n`
      );
      res.end();
      return;
    }

    let fullContent = "";
    let sentQuestions = 0;

    // Process the stream
    for await (const chunk of response.body) {
      const lines = chunk
        .toString()
        .split("\n")
        .filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line === "data: [DONE]") {
          continue;
        }

        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices?.[0]?.delta?.content || "";
            fullContent += content;

            // Try to extract complete question objects as they come in
            const questions = extractCompleteQuestions(fullContent);

            // Send any new questions we haven't sent yet
            for (let i = sentQuestions; i < questions.length; i++) {
              res.write(`data: ${JSON.stringify({ question: questions[i] })}\n\n`);
              sentQuestions++;
            }
          } catch (e) {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    // Final parse to catch any remaining questions
    const finalQuestions = extractCompleteQuestions(fullContent);
    for (let i = sentQuestions; i < finalQuestions.length; i++) {
      res.write(`data: ${JSON.stringify({ question: finalQuestions[i] })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    res.write(
      `data: ${JSON.stringify({ error: error.message || "LLM request failed." })}\n\n`
    );
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
