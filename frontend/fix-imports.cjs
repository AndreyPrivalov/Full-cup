const fs = require("node:fs");
const path = require("node:path");

const fixImports = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixImports(fullPath);
    } else if (fullPath.endsWith(".jsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let changed = false;
      if (content.includes('from "./PageLayout"')) {
        content = content.replace(/from "\.\/PageLayout"/g, 'from "./PageLayout/index.jsx"');
        changed = true;
      }
      if (content.includes('from "./components/PageLayout"')) {
        content = content.replace(
          /from "\.\/components\/PageLayout"/g,
          'from "./components/PageLayout/index.jsx"',
        );
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log("Fixed:", fullPath);
      }
    }
  }
};
fixImports("D:/Programs/Vibe/FullCup/frontend/src");
