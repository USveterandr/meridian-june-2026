/**
 * Strips emoji and pictographic symbols from user-entered text.
 *
 * Listing titles sometimes arrive with decorative emoji ("🌴 VISTA DEL
 * ATLÁNTICO…"). Emoji in <h1>, <title>, and meta descriptions look
 * unprofessional in Google results and can break link-preview rendering,
 * so headings and SEO tags render through this helper. Body copy is left
 * untouched.
 */
export function stripEmoji(input: string): string {
  return input
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
