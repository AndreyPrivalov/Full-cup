const fs = require("node:fs");
const path = require("node:path");

const directory = "d:/Programs/Vibe/FullCup/frontend/src";

const replacements = {
  // Spacing variables
  "--spc-1": "--spc-0-5x", // was 0.25rem (4px) -> now 8px (minimum step)
  "--spc-2": "--spc-0-5x", // was 0.5rem (8px) -> 8px
  "--spc-3": "--spc-1x", // was 0.75rem (12px) -> 16px
  "--spc-4": "--spc-1x", // was 1rem (16px) -> 16px
  "--spc-5": "--spc-1-5x", // was 1.25rem (20px) -> 24px
  "--spc-6": "--spc-1-5x", // was 1.5rem (24px) -> 24px
  "--spc-8": "--spc-2x", // was 2rem (32px) -> 32px
  "--spc-10": "--spc-2-5x", // was 2.5rem (40px) -> 40px
  "--spc-12": "--spc-3x", // was 3rem (48px) -> 48px
  "--spc-16": "--spc-4x", // was 4rem (64px) -> 64px

  // Spacing classes (gaps, p, m if they exist)
  "a-gap-1": "a-gap-0-5x",
  "a-gap-2": "a-gap-0-5x",
  "a-gap-3": "a-gap-1x",
  "a-gap-4": "a-gap-1x",
  "a-gap-5": "a-gap-1-5x",
  "a-gap-6": "a-gap-1-5x",
  "a-gap-8": "a-gap-2x",
  "a-gap-10": "a-gap-2-5x",
  "a-gap-12": "a-gap-3x",

  // Typography variables
  "--text-xs": "--font-size-s",
  "--text-sm": "--font-size-s",
  "--text-base": "--font-size-m",
  "--text-lg": "--font-size-l",
  "--text-xl": "--font-size-h4",
  "--text-2xl": "--font-size-h3",
  "--font-normal": "--font-weight-regular",

  // Typography classes
  "a-text-xs": "a-text-s",
  "a-text-sm": "a-text-s",
  "a-text-base": "a-text-m",
  "a-text-lg": "a-text-l",
  "a-text-xl": "a-text-h4",
  "a-text-2xl": "a-text-h3",
  "a-font-normal": "a-font-regular",

  // Colors
  "--clr-bg-primary": "--clr-bg-page",
  "--clr-bg-secondary": "--clr-bg-page",
  "--clr-income": "--clr-text-semantic-success",
  "--clr-income-hover": "--clr-text-semantic-success",
  "--clr-expense": "--clr-text-semantic-error",
  "--clr-expense-hover": "--clr-text-semantic-error",
  "--clr-border-subtle": "--clr-border-primary",
  "--clr-border-focus": "--clr-border-interactive",

  // Color classes
  "a-bg-primary": "a-bg-page",
  "a-bg-secondary": "a-bg-page",
  "a-clr-income": "a-clr-text-semantic-success",
  "a-clr-expense": "a-clr-text-semantic-error",
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

  // We should be careful to replace exact matches for some strings
  // but a simple global replace works for these specific token strings
  for (const [oldStr, newStr] of Object.entries(replacements)) {
    // using regex to match word boundaries where applicable to avoid partial matches
    // e.g. don't replace --spc-1 inside --spc-10 or --spc-16
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
