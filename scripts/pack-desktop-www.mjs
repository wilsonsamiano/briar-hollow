#!/usr/bin/env node
/**
 * Copy the production static build plus the rendered home page into the
 * desktop app. Requires the built preview on :8081.
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const dest = join(root, "desktop/www");
const html = await fetch("http://127.0.0.1:8081/").then((res) => {
  if (!res.ok) throw new Error(`preview ${res.status}`);
  return res.text();
});
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(join(root, ".vercel/output/static"), dest, { recursive: true });
writeFileSync(join(dest, "index.html"), html);
console.log(`packed desktop www (${html.length} byte index)`);
