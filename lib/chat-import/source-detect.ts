export type ImportSourcePlatform = "whatsapp" | "telegram" | "facebook";

export function detectImportSource(text: string): ImportSourcePlatform | null {
  const sample = text.trim();
  if (!sample) {
    return null;
  }

  if (
    /^\[\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4},\s*\d{1,2}:\d{2}/m.test(sample) ||
    /^\d{1,4}[\/.-]\d{1,2}[\/.-]\d{2,4},\s*.+?\s+-\s+.+:\s/m.test(sample)
  ) {
    return "whatsapp";
  }

  if (
    /^\[[0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4}\s+[0-9]{1,2}:\d{2}\]/m.test(sample) ||
    /(?:t\.me\/|telegram)/i.test(sample)
  ) {
    return "telegram";
  }

  if (
    /(?:facebook\.com|fb\.me|messenger|reacted to|replied to|sent an attachment|sent a photo)/i.test(sample) ||
    /^[A-Z][a-z]+ \d{1,2} at \d{1,2}:\d{2}\s?(?:AM|PM)/m.test(sample)
  ) {
    return "facebook";
  }

  return null;
}
