#!/usr/bin/env node
/**
 * Fix Handler return types: replace Promise<void> and Promise<void | ActionResult>
 * with Promise<ActionResult | undefined>, and replace bare return; with return undefined;
 * in .ts files under src/plugins that contain handler definitions.
 */
const fs = require("fs");
const path = require("path");

const pluginsRoot = path.join(__dirname, "../src/plugins");

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

let changed = 0;
const files = walkDir(pluginsRoot);
for (const filePath of files) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  content = content.replace(
    /\): Promise<void \| ActionResult> =>/g,
    "): Promise<ActionResult | undefined> =>"
  );
  content = content.replace(
    /\): Promise<void> =>/g,
    "): Promise<ActionResult | undefined> =>"
  );
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    changed++;
    console.log(filePath.replace(pluginsRoot + "/", ""));
  }
}
console.log(`Updated ${changed} files.`);
