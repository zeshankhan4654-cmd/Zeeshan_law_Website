/**
 * Turns "12h" / "7d" / "30m" / "45s" into milliseconds. The one place a
 * duration string is parsed, so JWT_EXPIRES_IN can drive both the token's
 * own expiry and the cookie's maxAge without the two risking drift.
 */
export function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`"${value}" isn't a recognized duration (e.g. "12h", "7d").`);
  }
  const amount = Number(match[1]);
  const unitMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * unitMs[match[2] as string]!;
}
