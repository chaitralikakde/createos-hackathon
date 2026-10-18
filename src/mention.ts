export function isUnpaidReport(text: string): boolean {
  const said = text.replace(/<@[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return /paid/i.test(said) && /unpaid/i.test(said);
}
