/** Joins class names, dropping falsy values — no dependency needed for this. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
