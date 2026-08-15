/**
 * Shared theme helpers.
 *
 * These live apart from `themes.ts` because the kinetic presets need them too,
 * and having that file import back into `themes.ts` created a cycle: the
 * kinetic module evaluated first and read `SYSTEM_SANS` before it existed.
 * TypeScript was perfectly happy; it only failed when the code actually ran.
 */

export const SYSTEM_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif";

export function googleFonts(...families: string[]): string {
  const query = families.map((f) => `family=${f.replace(/ /g, "+")}`).join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}
