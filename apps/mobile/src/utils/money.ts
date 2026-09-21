/** Formats a whole number of cents as dollars, e.g. 450 -> "$4.50". */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
