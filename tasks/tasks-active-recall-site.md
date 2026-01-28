## Relevant Files

- `index.html` - Main static page layout and combined input area.
- `styles.css` - Styling for the single-page UI and states.
- `app.js` - Client-side logic for input handling, text extraction, and API calls.
- `server.js` - Express server for the LLM API endpoint and CORS.
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

- [ ] 0.0 Create feature branch
- [ ] 1.0 Define UI structure and input behavior
- [ ] 2.0 Implement client-side text extraction
- [ ] 3.0 Build Express backend for LLM API
- [ ] 4.0 Render question results and states
