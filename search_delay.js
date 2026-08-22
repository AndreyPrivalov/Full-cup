const fs = require("node:fs");
const path = require("node:path");

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === "node_modules" || file === "dist" || file === ".git") continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith(".js") || file.endsWith(".jsx")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (
        content.includes("setTimeout") ||
        content.includes("delay") ||
        content.includes("Promise(")
      ) {
        console.log(`Found in: ${fullPath}`);
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (line.includes("setTimeout") || line.includes("delay") || line.includes("Promise(")) {
            console.log(`  Line ${i + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir("d:/Programs/Vibe/FullCup");
