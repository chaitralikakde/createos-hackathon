export function rewriteEnroll(source: string, output: string): string | null {
  const wrongRow = /payment wrote the wrong row:/i.test(output)
    && /Maya=unpaid/.test(output)
    && /Ava=paid/.test(output);
  if (!wrongRow) return null;
  const next = source.replace(
    "student.email !== checkout.email",
    "student.email === checkout.email",
  );
  return next === source ? null : next;
}
