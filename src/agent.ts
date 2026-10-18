import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@nodeops-createos/sandbox";
import { rewriteEnroll } from "./fixer.ts";
import { openFixPullRequest } from "./github.ts";
import { foundBugMessage } from "./messages.ts";
import { stripeProjectLine } from "./stripe-project.ts";
import { mayaPayment } from "./stripe-payment.ts";

const root = path.resolve(import.meta.dirname, "..");
const course = path.join(root, "site");

export interface FixReport {
  attempts: Array<{ exitCode: number; output: string }>;
  fixedSource: string;
  pullRequestUrl: string | null;
  slackText: string;
}

function sandboxKey(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.CREATEOS_SANDBOX_API_KEY ?? process.env.CREATEOS_PROJECT_API_KEY;
  if (!apiKey) {
    throw new Error("Set CREATEOS_SANDBOX_API_KEY. Stripe Projects also writes CREATEOS_PROJECT_API_KEY into .env.");
  }
  return {
    apiKey,
    baseUrl: (process.env.CREATEOS_SANDBOX_BASE_URL ?? "https://api.sb.createos.sh").replace(/\/$/, ""),
  };
}

export async function fixUntilGreen(): Promise<FixReport> {
  const payment = mayaPayment();
  if (!payment.paid) {
    throw new Error(`Stripe sandbox payment ${payment.id} is not paid.`);
  }
  const { apiKey, baseUrl } = sandboxKey();
  const client = createClient({ apiKey, baseUrl });
  const sandbox = await client.createSandbox({
    shape: "s-1vcpu-1gb",
    rootfs: "devbox:1",
    name: "payment-fix",
  });
  const attempts: FixReport["attempts"] = [];
  let source = readFileSync(path.join(course, "course.mjs"), "utf8");
  const test = readFileSync(path.join(course, "course.test.mjs"), "utf8");

  try {
    await sandbox.files.upload("/workspace/course.test.mjs", test);
    await sandbox.files.upload("/workspace/payment.json", JSON.stringify(payment));
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await sandbox.files.upload("/workspace/course.mjs", source);
      const ran = await sandbox.runCommand("node", ["--test", "/workspace/course.test.mjs"]);
      const output = `${ran.result.stdout}\n${ran.result.stderr}`.trim();
      attempts.push({ exitCode: ran.result.exit_code, output });
      console.log(`\nAttempt ${attempt} exit ${ran.result.exit_code}`);
      console.log(output);
      if (ran.result.exit_code === 0) break;
      const next = rewriteEnroll(source, output);
      if (!next) {
        throw new Error("The test failed and the output did not say what to change.");
      }
      source = next;
    }
  } finally {
    await sandbox.destroy();
  }

  const passed = attempts.at(-1)?.exitCode === 0;
  if (!passed) {
    throw new Error("The test was still failing after 4 attempts.");
  }

  const pull = await openFixPullRequest(source);
  return {
    attempts,
    fixedSource: source,
    pullRequestUrl: pull.url,
    slackText: foundBugMessage(pull.url, stripeProjectLine(), payment.id),
  };
}
