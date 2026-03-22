/**
 * Shared date utility functions used across worship loggers and history.
 */

export function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
