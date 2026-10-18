import { spawnSync } from "node:child_process";

export function stripeProjectLine(): string | null {
  const ran = process.platform === "win32"
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", "stripe projects status --json"], {
        encoding: "utf8",
        windowsHide: true,
      })
    : spawnSync("stripe", ["projects", "status", "--json"], { encoding: "utf8" });
  if (ran.status !== 0 || !ran.stdout) return null;
  try {
    const body = JSON.parse(ran.stdout) as {
      data?: {
        project?: { name?: string };
        services?: Array<{ provider?: string; pricing?: string }>;
      };
    };
    const name = body.data?.project?.name;
    const service = body.data?.services?.[0];
    if (!name || !service?.provider) return null;
    const pricing = service.pricing ? ` (${service.pricing})` : "";
    return `Stripe project ${name} ran the check in the ${service.provider} sandbox${pricing}.`;
  } catch {
    return null;
  }
}
