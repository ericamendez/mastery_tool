const inputArea = document.getElementById("input-area");
const textInput = document.getElementById("text-input");
const fileInput = document.getElementById("file-input");
const fileButton = document.getElementById("file-button");
const generateButton = document.getElementById("generate-button");
const statusMessage = document.getElementById("status-message");
const questionList = document.getElementById("question-list");

let currentFile = null;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ["pdf", "txt", "docx"];

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const setStatus = (message, isError = false) => {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#b42318" : "#3658c6";
};

const clearQuestions = () => {
  questionList.innerHTML = "";
};

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

const handleOptionClick = (event) => {
  const btn = event.currentTarget;
  const isCorrect = btn.dataset.correct === "true";
  const questionCard = btn.closest(".mc-question");
  const allOptions = questionCard.querySelectorAll(".mc-option");
  const feedback = questionCard.querySelector(".mc-feedback");

  allOptions.forEach((opt) => {
    opt.disabled = true;
    if (opt.dataset.correct === "true") {
      opt.classList.add("correct");
    }
  });

  if (isCorrect) {
    btn.classList.add("selected-correct");
    feedback.textContent = "Correct! 🎉";
    feedback.className = "mc-feedback correct";
  } else {
    btn.classList.add("selected-wrong");
    feedback.textContent = "Not quite. The correct answer is highlighted.";
    feedback.className = "mc-feedback incorrect";
  }
};

const renderSingleQuestion = (q) => {
  const item = document.createElement("div");
  item.className = "question-item";
  item.style.opacity = "0";
  item.style.transform = "translateY(10px)";

  if (q.type === "open") {
    item.innerHTML = `
      <div class="question-card open-question">
        <p class="question-text">${escapeHtml(q.question)}</p>
      </div>
    `;
  } else if (q.type === "multiple_choice") {
    const optionsHtml = q.options
      .map(
        (opt, optIndex) => `
        <button 
          type="button" 
          class="mc-option" 
          data-correct="${opt === q.correctAnswer}"
        >
          <span class="option-letter">${String.fromCharCode(65 + optIndex)}</span>
          <span class="option-text">${escapeHtml(opt)}</span>
        </button>
      `
      )
      .join("");

    item.innerHTML = `
      <div class="question-card mc-question">
        <p class="question-text">${escapeHtml(q.question)}</p>
        <div class="mc-options">${optionsHtml}</div>
        <p class="mc-feedback"></p>
      </div>
    `;
  }

  questionList.appendChild(item);

  // Animate in
  requestAnimationFrame(() => {
    item.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    item.style.opacity = "1";
    item.style.transform = "translateY(0)";
  });

  // Add click handlers for MC options
  item.querySelectorAll(".mc-option").forEach((btn) => {
    btn.addEventListener("click", handleOptionClick);
  });
};

const requestQuestionsStream = async (text, onQuestion, onError, onDone) => {
  const response = await fetch("/api/questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to generate questions.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let questionCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          
          if (data.error) {
            onError(new Error(data.error));
            return;
          }
          
          if (data.question) {
            questionCount++;
            onQuestion(data.question, questionCount);
          }
          
          if (data.done) {
            onDone(questionCount);
            return;
          }
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }
  }

  onDone(questionCount);
};

const getExtension = (filename) => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
};

const isSupportedFile = (file) => {
  return SUPPORTED_EXTENSIONS.includes(getExtension(file.name));
};

const validateFile = (file) => {
  if (!isSupportedFile(file)) {
    return "Unsupported file type. Please upload PDF, DOCX, or TXT.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File is too large. Please upload a file under 10MB.";
  }
  return "";
};

const handleFile = (file) => {
  const error = validateFile(file);
  if (error) {
    setStatus(error, true);
    return;
  }
  currentFile = file;
  textInput.value = "";
  clearQuestions();
  setStatus(`File selected: ${file.name}`);
};

fileButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    handleFile(file);
  }
});

textInput.addEventListener("input", () => {
  if (textInput.value.trim().length > 0) {
    currentFile = null;
    fileInput.value = "";
    clearQuestions();
    setStatus("Text ready.");
  } else {
    setStatus("");
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  inputArea.addEventListener(eventName, (event) => {
    event.preventDefault();
    inputArea.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  inputArea.addEventListener(eventName, (event) => {
    event.preventDefault();
    inputArea.classList.remove("drag-over");
  });
});

inputArea.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) {
    handleFile(file);
  }
});

const extractTextFromPdf = async (file) => {
  if (!window.pdfjsLib) {
    throw new Error("PDF support is unavailable.");
  }

  const data = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data }).promise;
  let text = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    text += `${pageText}\n`;
  }

  return text.trim();
};

const extractTextFromDocx = async (file) => {
  if (!window.mammoth) {
    throw new Error("DOCX support is unavailable.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
};

const extractTextFromFile = async (file) => {
  const extension = getExtension(file.name);
  if (extension === "txt") {
    return file.text();
  }
  if (extension === "pdf") {
    return extractTextFromPdf(file);
  }
  if (extension === "docx") {
    return extractTextFromDocx(file);
  }
  throw new Error("Unsupported file type.");
};

generateButton.addEventListener("click", async () => {
  clearQuestions();
  const text = textInput.value.trim();
  generateButton.disabled = true;

  try {
    let sourceText = text;

    if (!sourceText && currentFile) {
      setStatus("Extracting text from file...");
      sourceText = await extractTextFromFile(currentFile);
    }

    if (!sourceText) {
      setStatus("Please add text or upload a file first.", true);
      generateButton.disabled = false;
      return;
    }

    setStatus("Generating questions...");

    await requestQuestionsStream(
      sourceText,
      // onQuestion callback - called for each question as it arrives
      (question, count) => {
        renderSingleQuestion(question);
        setStatus(`Generated ${count} question${count > 1 ? "s" : ""}...`);
      },
      // onError callback
      (error) => {
        setStatus(error.message || "Unable to generate questions.", true);
        generateButton.disabled = false;
      },
      // onDone callback
      (totalCount) => {
        if (totalCount === 0) {
          setStatus("No questions were generated. Try different content.", true);
        } else {
          setStatus(`Done! Generated ${totalCount} questions.`);
        }
        generateButton.disabled = false;
      }
    );
  } catch (error) {
    setStatus(error.message || "Unable to generate questions.", true);
    generateButton.disabled = false;
  }
});
