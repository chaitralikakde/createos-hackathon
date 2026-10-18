export const CHANGES_CHANNEL = "C0CA552P1C1";

export const LOOKING_INTO_IT = "We're looking into this and will update you soon.";

export function foundBugMessage(
  pullRequestUrl: string | null,
  stripeLine: string | null,
  paymentId: string | null = null,
): string {
  const lines = ["Found 1 bug."];
  lines.push(pullRequestUrl ?? "The pull request was not opened.");
  if (paymentId) lines.push(`Stripe test payment ${paymentId} ($49, paid).`);
  if (stripeLine) lines.push(stripeLine);
  return lines.join("\n");
}
