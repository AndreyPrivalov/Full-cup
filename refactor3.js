const fs = require("node:fs");

const usedClasses = new Set([
  "activeProjControls",
  "activeProjInfo",
  "backlogLayout",
  "backlogListSection",
  "currentMonthLabel",
  "daysLeftBadge",
  "formActions",
  "limitField",
  "limitLabel",
  "limitsGrid",
  "livePriority",
  "livePriorityRow",
  "livePriorityVal",
  "monthNav",
  "navBtn",
  "rewardsHeader",
  "scoreInputWrapper",
  "scoreNum",
  "scoresGrid",
  "scoreSlider",
  "sharesRow",
  "spentHighlight",
  "statusBadge",
  "status-backlog",
  "status-planned",
  "status-active",
  "status-completed",
  "status-cancelled",
  "priorityBadge",
  "utilizationFilled",
  "utilizationInfo",
]);

const css = fs.readFileSync("frontend/src/components/ProjectsView.module.css", "utf-8");

// We need to parse simple css blocks.
// We can split by "}" and then check if the block starts with one of our classes.
const newCss = [];
const blocks = css.split("}");

for (const block of blocks) {
  if (!block.trim()) continue;
  let keep = false;
  for (const cls of usedClasses) {
    // Regex to match the class name
    const regex = new RegExp(`\\.${cls}\\b`);
    if (regex.test(block)) {
      keep = true;
      break;
    }
  }
  if (keep) {
    newCss.push(`${block.trim()}\n}`);
  }
}

fs.writeFileSync("frontend/src/components/ProjectsView.module.css", newCss.join("\n\n"));
console.log("Updated ProjectsView.module.css");
