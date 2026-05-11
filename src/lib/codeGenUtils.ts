/**
 * Generate a short uppercase code from a name string.
 *
 * Examples:
 *   "PT Pertamina Hulu Energi"  → "PTPHE"
 *   "SKK Migas Data Center"     → "SKKMIGAS-DC"
 *   "Badan Pengelola Migas"     → "BPM"
 *
 * Words shorter than 4 chars are kept whole (PT, SKK, etc),
 * longer words are reduced to their first letter.
 */
export function generateCode(name: string, maxLen = 20): string {
  if (!name.trim()) return "";

  const words = name
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "") // strip special chars
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "";

  // Single word → just uppercase + truncate
  if (words.length === 1) {
    return words[0].toUpperCase().slice(0, maxLen);
  }

  const code = words
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase()))
    .join("");

  return code.slice(0, maxLen);
}
