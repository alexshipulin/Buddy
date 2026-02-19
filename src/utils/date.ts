export function toIsoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isSameDayIso(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}
