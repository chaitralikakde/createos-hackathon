import { existsSync, readFileSync } from "node:fs";
import { App } from "@slack/bolt";
import { fixUntilGreen } from "./agent.ts";
import { isUnpaidReport } from "./mention.ts";
import { CHANGES_CHANNEL, LOOKING_INTO_IT } from "./messages.ts";

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

const token = process.env.SLACK_BOT_TOKEN;
const appToken = process.env.SLACK_APP_TOKEN;
if (!token || !appToken) {
  throw new Error("Set SLACK_BOT_TOKEN and SLACK_APP_TOKEN. The app needs the app_mention event and Socket Mode.");
}

const app = new App({ token, appToken, socketMode: true });

app.event("app_mention", async ({ event, client }) => {
  const text = "text" in event ? event.text : "";
  console.log(`Mention in ${event.channel}: ${text}`);
  const thread = { channel: event.channel, thread_ts: event.ts };
  if (!isUnpaidReport(text)) {
    await client.chat.postMessage({
      ...thread,
      text: "I heard you. Say that you paid and the status is still unpaid, and I will run the fix.",
    });
    return;
  }
  await client.chat.postMessage({ ...thread, text: LOOKING_INTO_IT });
  try {
    const report = await fixUntilGreen();
    await client.chat.postMessage({ channel: CHANGES_CHANNEL, text: report.slackText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The sandbox run stopped.";
    await client.chat.postMessage({ ...thread, text: message });
  }
});

await app.start();
console.log("Listening for a mention in Slack.");
