import { existsSync, readFileSync } from "node:fs";
import { fixUntilGreen } from "./agent.ts";

function loadEnvFile(): void {
  const file = new URL("../.env", import.meta.url);
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const report = await fixUntilGreen();
console.log(`\n${report.slackText}`);
process.exit(0);
