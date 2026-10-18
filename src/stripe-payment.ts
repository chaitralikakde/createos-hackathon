import { spawnSync } from "node:child_process";

export interface CoursePayment {
  id: string;
  paid: boolean;
  student: string;
  email: string;
  studentId: string;
  course: string;
  fee: string;
}

const maya = {
  student: "Maya",
  email: "maya@class.test",
  studentId: "stu_maya",
  course: "Intro to product design",
  fee: "$49",
};

const sandboxAccount = "acct_1URb59DJyyyx7wYk";

function run(args: string[]): { status: number | null; text: string } {
  const command = ["stripe", ...args].map((arg) => /[\s"]/.test(arg) ? `"${arg.replaceAll("\"", "\\\"")}"` : arg).join(" ");
  const ran = process.platform === "win32"
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", command], { encoding: "utf8", windowsHide: true })
    : spawnSync("stripe", args, { encoding: "utf8" });
  return { status: ran.status, text: `${ran.stdout ?? ""}\n${ran.stderr ?? ""}` };
}

function stripe(args: string[]): Record<string, unknown> {
  const ran = run(args);
  const start = ran.text.indexOf("{");
  const end = ran.text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Stripe sandbox request failed.");
  }
  const payload = JSON.parse(ran.text.slice(start, end + 1)) as {
    error?: { message?: string };
  } & Record<string, unknown>;
  if (payload.error?.message) throw new Error(payload.error.message);
  return payload;
}

function readMayaPayment(): CoursePayment {
  const customers = stripe([
    "customers",
    "list",
    "--email",
    maya.email,
    "--limit",
    "1",
  ]) as { data?: Array<{ id: string }> };
  const customer = customers.data?.[0] ?? (stripe([
    "customers",
    "create",
    "--name",
    maya.student,
    "--email",
    maya.email,
  ]) as { id: string });

  const intents = stripe([
    "payment_intents",
    "list",
    "--customer",
    customer.id,
    "--limit",
    "10",
  ]) as { data?: Array<{ id: string; status: string; amount: number }> };
  const existing = intents.data?.find((item) => item.status === "succeeded" && item.amount === 4900);
  const payment = existing ?? (stripe([
    "payment_intents",
    "create",
    "--amount",
    "4900",
    "--currency",
    "usd",
    "--customer",
    customer.id,
    "--confirm",
    "--payment-method",
    "pm_card_visa",
    "--description",
    maya.course,
    "-d",
    "metadata[student]=Maya",
    "-d",
    "metadata[email]=maya@class.test",
    "-d",
    "automatic_payment_methods[enabled]=true",
    "-d",
    "automatic_payment_methods[allow_redirects]=never",
  ]) as { id: string; status: string });

  return {
    id: payment.id,
    paid: payment.status === "succeeded",
    ...maya,
  };
}

export function mayaPayment(): CoursePayment {
  run(["switch", sandboxAccount, "--format", "json"]);
  try {
    return readMayaPayment();
  } finally {
    run(["switch", "context", sandboxAccount, "--live"]);
  }
}
