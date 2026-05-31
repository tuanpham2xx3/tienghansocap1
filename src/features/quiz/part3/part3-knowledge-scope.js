const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../../..");
const PART3_SCOPE_PATH = path.join(ROOT_DIR, "src/data/korean/source/part3-translation-scope.json");

function readPart3KnowledgeScope() {
  return JSON.parse(fs.readFileSync(PART3_SCOPE_PATH, "utf8"));
}

function normalizePart3Text(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

module.exports = {
  PART3_SCOPE_PATH,
  readPart3KnowledgeScope,
  normalizePart3Text,
};
