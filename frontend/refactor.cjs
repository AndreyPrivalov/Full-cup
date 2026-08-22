const fs = require("node:fs");
const path = require("node:path");
const componentsDir = path.join("D:/Programs/Vibe/FullCup/frontend/src/components");

[
  "DashboardView.jsx",
  "KaifBalanceView.jsx",
  "ProjectsView.jsx",
  "OperationsView.jsx",
  "SavingsView.jsx",
].forEach((file) => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  content = content.replace(
    /import \{ PageLayout \} from "\.\/PageLayout";/g,
    'import { PageLayout, PageGrid, PageColumn } from "./PageLayout";',
  );
  content = content.replace(/<PageLayout\.Grid/g, "<PageGrid");
  content = content.replace(/<\/PageLayout\.Grid>/g, "</PageGrid>");
  content = content.replace(/<PageLayout\.Column/g, "<PageColumn");
  content = content.replace(/<\/PageLayout\.Column>/g, "</PageColumn>");

  fs.writeFileSync(filePath, content);
});
console.log("done");
