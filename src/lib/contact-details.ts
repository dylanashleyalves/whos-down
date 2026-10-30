// Spots social handles, links and phone numbers in bios. The database runs the same check
// when a bio is saved: keep in step with supabase/migrations/0016_socials_and_bio_check.sql.
const PLATFORMS =
  'ig|insta|instagram|snap|snapchat|telegram|tele|tg|tiktok|whatsapp|wa|discord|fb|facebook|twitter';

const CONTACT_PATTERNS = [
  // @name, including email addresses
  /@[a-z0-9_.]{2,}/,
  // Links
  /\b(instagram\.com|t\.me|telegram\.me|wa\.me|tiktok\.com|snapchat\.com|discord\.gg|discord\.com|facebook\.com|fb\.com|twitter\.com|x\.com)\b/,
  // "ig: name", "tele - name", "snap id"
  String.raw`\b(${PLATFORMS})\b\s*(:|=|@|-\s|id\b|handle\b)`,
  // "my ig is name"
  String.raw`\bmy\s+(${PLATFORMS})\s+(is|at)\b`,
  // "dm me on ig", "add me on tele", "hit me up on snap"
  String.raw`\b(add|follow|dm|message|msg|text|find|contact|reach|ping|hmu|hit)\b(\s+me)?(\s+(up|on|at|via|in|through))*\s+(${PLATFORMS})\b`,
  // "ig dylan_01": a platform, then something shaped like a handle
  /\b(ig|insta|instagram|snap|snapchat|telegram|tele|tg|tiktok|discord)\b\s+[a-z0-9_.]*[0-9_.][a-z0-9_.]*/,
  // Camera or ghost emoji as a label: "📸: name"
  /(📸|👻)\s*:\s*[a-z0-9_.]{3,}/,
  // 8 or more digits
  /([+]?[0-9][ -]?){8,}/,
].map((pattern) => new RegExp(pattern, 'iu'));

export function hasContactDetails(text: string) {
  return CONTACT_PATTERNS.some((pattern) => pattern.test(text));
}
