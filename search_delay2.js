const fs = require("node:fs");
const path = require("node:path");

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === "node_modules" || file === "dist" || file === ".git" || file === ".gemini")
      continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith(".js") || file.endsWith(".jsx")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.match(/sleep|delay|setTimeout|Promise|await/i)) {
        console.log(`Found in: ${fullPath}`);
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (line.match(/sleep|delay|setTimeout|new Promise/i)) {
            console.log(`  Line ${i + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir("d:/Programs/Vibe/FullCup");
