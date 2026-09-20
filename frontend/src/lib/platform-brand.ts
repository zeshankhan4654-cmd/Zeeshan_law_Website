/**
 * The platform's own name, in one place.
 *
 * Kept apart from any chamber's name on purpose. A chamber's public
 * website is that advocate's — it carries their name, set in Site Settings
 * — while sign-up and the console belong to the platform every chamber
 * sits on. The two must not drift into each other.
 *
 * The mobile app reads the same name from `app.config.js`. Renaming the
 * product means those two lines.
 */
export const PLATFORM_NAME = "Lawyer360";

/** For a page title, where the product's name goes after the page's own. */
export function platformTitle(page: string): string {
  return `${page} — ${PLATFORM_NAME}`;
}
