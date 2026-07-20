const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "..",
  "docs",
  "FRONTEND_SPLIT_SERVICE_BLUEPRINT_DETAILED_2026-07-08.md",
);

const source = fs.readFileSync(filePath, "utf8");
const next = source.replace(/\\n/g, "\n");

fs.writeFileSync(filePath, next, "utf8");
console.log("Normalized escaped newlines in detailed blueprint.");
