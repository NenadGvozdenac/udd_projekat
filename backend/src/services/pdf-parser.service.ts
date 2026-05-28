import pdfParse from 'pdf-parse';

export interface ParsedReport {
  forensicAnalystName: string;
  organizationName: string;
  malwareName: string;
  malwareDescription: string;
  threatClassification: string;
  sampleHash: string;
  pdfContent: string;
  city?: string;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedReport> {
  const data = await pdfParse(buffer);
  const text = data.text;

  return {
    organizationName:    extractOrganization(text),
    city:                extractCity(text),
    threatClassification: extractClassification(text),
    sampleHash:          extractHash(text),
    malwareName:         extractMalwareName(text),
    malwareDescription:  extractDescription(text),
    forensicAnalystName: extractAnalyst(text),
    pdfContent:          text,
  };
}

/**
 * Organization is the first non-empty line that comes before the address line.
 * Template: "Organizacija <NAZIV_ORGANIZACIJE>" or just the org name as first line.
 */
function extractOrganization(text: string): string {
  // Try explicit "Organizacija <X>" pattern
  const explicit = text.match(/organizacija[:\s]+([^\n<>]+)/i);
  if (explicit?.[1]) return explicit[1].trim();

  // Fallback: first non-empty line
  const firstLine = text.split('\n').find((l) => l.trim().length > 2);
  return firstLine?.trim() ?? '';
}

/**
 * Address format: "NAZIV_ULICE, BROJ_ZGRADE, GRAD"
 * City is the last segment of the address.
 */
function extractCity(text: string): string {
  // Line that looks like an address: contains comma-separated parts, one of which is a number
  const addrLine = text
    .split('\n')
    .find((l) => /\d/.test(l) && l.includes(',') && l.trim().length > 5);

  if (addrLine) {
    const parts = addrLine.split(',').map((p) => p.trim());
    // City is the last segment
    const city = parts[parts.length - 1].replace(/<[^>]+>/g, '').trim();
    if (city && !/^\d+$/.test(city)) return city;
  }
  return '';
}

/**
 * "Klasifikacija: <KLASIFIKACIJA_PRETNJE>, <HASH>"
 */
function extractClassification(text: string): string {
  const match = text.match(/klasifikacija[:\s]+([^\s,<>]+)/i);
  if (!match?.[1]) return '';

  const val = match[1].toLowerCase().trim();
  const map: Record<string, string> = {
    niska: 'low', low: 'low',
    srednja: 'medium', medium: 'medium',
    visoka: 'high', high: 'high',
    kriticna: 'critical', kritična: 'critical', critical: 'critical',
  };
  return map[val] ?? val;
}

/**
 * Hash appears on the Klasifikacija line after the classification value.
 * Falls back to scanning the whole text.
 */
function extractHash(text: string): string {
  // Try the klasifikacija line first: "Klasifikacija: X, <HASH>"
  const klasLine = text.match(/klasifikacija[^\n]*/i)?.[0] ?? '';
  const sha256InLine = klasLine.match(/\b[A-Fa-f0-9]{64}\b/);
  if (sha256InLine) return sha256InLine[0];
  const md5InLine = klasLine.match(/\b[A-Fa-f0-9]{32}\b/);
  if (md5InLine) return md5InLine[0];

  // Full-text fallback
  const sha256 = text.match(/\b[A-Fa-f0-9]{64}\b/);
  if (sha256) return sha256[0];
  const md5 = text.match(/\b[A-Fa-f0-9]{32}\b/);
  return md5?.[0] ?? '';
}

/**
 * "Priložen fajl predstavlja artefakt koji ukazuje na <NAZIV_PRETNJE>."
 */
function extractMalwareName(text: string): string {
  const match = text.match(/ukazuje\s+na\s+([^.<>\n]+)/i);
  return match?.[1]?.trim() ?? '';
}

/**
 * The description block follows "Opis ponašanja malvera/pretnje:" and sits inside a box.
 * It ends before the analyst signature section.
 */
function extractDescription(text: string): string {
  const match = text.match(/opis\s+pona[sš]anja\s+malvera\/pretnje[:\s]+([\s\S]{10,2000}?)(?:potpis|<ime>|\n{3,}|$)/i);
  if (match?.[1]) return match[1].trim().substring(0, 2000);

  // Fallback: everything after "pretnje:" up to 2000 chars
  const alt = text.match(/pretnje[:\s]+([\s\S]{10,2000})/i);
  return alt?.[1]?.trim().substring(0, 2000) ?? '';
}

/**
 * Analyst name is above "Potpis forenzičara" (first signature box).
 */
function extractAnalyst(text: string): string {
  // Pattern: "<IME> <PREZIME>\nPotpis forenzičara"
  const match = text.match(/([A-ZŠĐČĆŽ][a-zšđčćž]+\s+[A-ZŠĐČĆŽ][a-zšđčćž]+)\s*\n\s*[Pp]otpis\s+forenzičara/);
  if (match?.[1]) return match[1].trim();

  // Looser fallback: any capitalized two-word name near "potpis"
  const loose = text.match(/([A-ZŠĐČĆŽ][a-zšđčćž]+ [A-ZŠĐČĆŽ][a-zšđčćž]+)\s*[\n\r]+\s*Potpis/i);
  return loose?.[1]?.trim() ?? '';
}

