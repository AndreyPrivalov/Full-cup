const fs = require("node:fs");
const path = require("node:path");

const directory = "d:/Programs/Vibe/FullCup/frontend/src";

const replacements = {
  // Spacing variables
  "--spc-0-5x": "--spc-8",
  "--spc-1x": "--spc-16",
  "--spc-1-5x": "--spc-24",
  "--spc-2x": "--spc-32",
  "--spc-2-5x": "--spc-40",
  "--spc-3x": "--spc-48",
  "--spc-4x": "--spc-64",
  "--spc-5x": "--spc-80",
  "--spc-6x": "--spc-80", // Cap at 80 based on new scale

  // Spacing classes
  "a-gap-0-5x": "a-gap-8",
  "a-gap-1x": "a-gap-16",
  "a-gap-1-5x": "a-gap-24",
  "a-gap-2x": "a-gap-32",
  "a-gap-2-5x": "a-gap-40",
  "a-gap-3x": "a-gap-48",
  "a-gap-4x": "a-gap-64",
  "a-gap-5x": "a-gap-80",
  "a-gap-6x": "a-gap-80",
};

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat?.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      if (filePath.endsWith(".jsx") || filePath.endsWith(".css") || filePath.endsWith(".js")) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walkDir(directory);
let updatedFiles = 0;

files.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  let newContent = content;

  for (const [oldStr, newStr] of Object.entries(replacements)) {
    const regex = new RegExp(`${oldStr}(?![\\w\\-])`, "g");
    newContent = newContent.replace(regex, newStr);
  }

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, "utf8");
    updatedFiles++;
    console.log(`Updated: ${file}`);
  }
});

console.log(`Migration complete. Files updated: ${updatedFiles}`);
