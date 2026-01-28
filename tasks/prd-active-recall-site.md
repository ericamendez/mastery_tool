# Product Requirements Document: Active Recall Study Site

## Introduction/Overview
Create a static HTML/CSS/Vanilla JavaScript website that lets students paste text or drag-and-drop files (PDF, TXT, DOCX) into a single input area. The site extracts the text, sends it to a backend LLM API, and displays 5–15 active-recall questions based on the length and main points of the content. The goal is to improve comprehension and confidence while studying.

## Goals
- Allow students to submit text or supported files and receive recall questions.
- Generate 5–15 clear, relevant questions that focus on main points.
- Keep the experience lightweight and usable without accounts or data storage.

## User Stories
- As a student, I can paste text and get recall questions to test my understanding.
- As a student, I can drop a PDF/DOCX/TXT file into the same input area and get recall questions from its content.
- As a student, I can quickly see 5–15 questions without extra steps or sign-in.

## Functional Requirements
1. The system must provide a single input area that accepts pasted text and drag-and-drop files.
2. The system must accept PDF, TXT, and DOCX files via drag-and-drop or a click-to-upload option within the same input area.
3. The system must automatically detect whether the user provided text or a file and handle it without requiring the user to choose a type.
4. The system must extract text from supported file types on the client.
5. The system must show a clear error for unsupported file types or failed extraction.
6. The system must allow users to submit extracted/pasted text for question generation.
7. The system must call a backend API endpoint to generate questions.
8. The system must display a loading state while questions are being generated.
9. The system must display 5–15 questions in a readable list.
10. The system must not require user accounts or save user content.

## Non-Goals (Out of Scope)
- User accounts, login, or saved study history.
- Answer input, grading, or scoring.
- Analytics or progress tracking.
- Offline LLM question generation.

## Design Considerations (Optional)
- Simple single-page layout with one combined input area that supports typing/pasting and drag-and-drop, and auto-detects text vs file.
- Provide brief guidance text (e.g., supported file types, privacy note).
- Use accessible colors, keyboard-focusable controls, and clear error states.

## Technical Considerations (Optional)
- The frontend should `fetch` a backend API endpoint for LLM calls so the API key is not exposed in the browser.
- Backend should handle the LLM provider (e.g., OpenAI) and return a list of questions.
- Client-side text extraction can use libraries such as PDF.js (PDF) and Mammoth.js (DOCX).
- Add CORS configuration on the backend to allow requests from the static site origin.

## Success Metrics
- 90%+ of submissions return 5–15 questions without errors.
- Median time to receive questions is under 10 seconds for typical inputs.
- Students report improved confidence or understanding in quick feedback surveys.

## Open Questions
- What is the exact backend API endpoint and expected request/response shape?
- Which LLM provider and model should be used?
- What is the maximum file size or text length to accept?
- Should the questions target a specific format (short answer, open-ended, multiple choice)?
- Should the site support languages beyond English?
