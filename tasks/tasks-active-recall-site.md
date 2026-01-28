## Relevant Files

- `index.html` - Main static page layout and combined input area.
- `styles.css` - Styling for the single-page UI and states.
- `app.js` - Client-side logic for input handling, text extraction, and API calls.
- `server.js` - Express server for the LLM API endpoint and CORS.
- `package.json` - Server dependencies and scripts for Express.
- `.env.example` - Document required environment variables for the LLM API.
- `lib/pdf.js` - PDF parsing library (if vendored locally).
- `lib/mammoth.js` - DOCX parsing library (if vendored locally).

### Notes

- Unit tests are optional for a static site unless a test framework is added.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch for this feature
- [x] 1.0 Define UI structure and input behavior
  - [x] 1.1 Create combined input area (paste + drag-and-drop + click upload)
  - [x] 1.2 Add guidance text (supported types, privacy note)
  - [x] 1.3 Add Generate button and basic layout sections
- [x] 2.0 Implement client-side text extraction
  - [x] 2.1 Add TXT parsing from File API
  - [x] 2.2 Add PDF parsing with PDF.js
  - [x] 2.3 Add DOCX parsing with Mammoth.js
  - [x] 2.4 Implement auto-detect logic (text vs file)
  - [x] 2.5 Add file-size and extraction error handling
- [x] 3.0 Build Express backend for LLM API
  - [x] 3.1 Initialize Express server and add CORS
  - [x] 3.2 Add POST endpoint for question generation
  - [x] 3.3 Integrate LLM provider call with prompt and 5–15 output range
  - [x] 3.4 Validate inputs and return structured question list
  - [x] 3.5 Add `.env.example` and server start script
- [x] 4.0 Render question results and states
  - [x] 4.1 Add loading, success, and error UI states
  - [x] 4.2 Render questions as a readable list
  - [x] 4.3 Reset/clear UI for new submissions