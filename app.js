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

const renderQuestions = (questions) => {
  questionList.innerHTML = "";
  questions.forEach((question) => {
    const item = document.createElement("li");
    item.textContent = question;
    questionList.appendChild(item);
  });
};

const requestQuestions = async (text) => {
  const response = await fetch("/api/questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody.error || "Failed to generate questions.";
    throw new Error(errorMessage);
  }

  return response.json();
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
      return;
    }

    setStatus("Generating questions...");
    const { questions } = await requestQuestions(sourceText);
    if (!questions?.length) {
      throw new Error("No questions returned from the server.");
    }
    renderQuestions(questions);
    setStatus(`Generated ${questions.length} questions.`);
  } catch (error) {
    setStatus(error.message || "Unable to generate questions.", true);
  } finally {
    generateButton.disabled = false;
  }
});
