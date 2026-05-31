const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../../..");
const PART2_SCOPE_PATH = path.join(ROOT_DIR, "src/data/korean/source/part2-reading-scope.json");

function readPart2ReadingScope() {
  return JSON.parse(fs.readFileSync(PART2_SCOPE_PATH, "utf8"));
}

module.exports = {
  PART2_SCOPE_PATH,
  readPart2ReadingScope,
};
