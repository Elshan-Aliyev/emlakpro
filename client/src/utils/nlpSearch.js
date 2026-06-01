// Natural language query parser — deterministic, no LLM
// Extracts structured search params from free-text queries like:
//   "2 bedroom apartment under 200k"
//   "sea view villa for rent in Yasamal"
//   "studio near metro furnished"

// BEDROOM_TOKENS retained for external consumers; internal parsing uses typed sub-groups below
// eslint-disable-next-line no-unused-vars
const BEDROOM_TOKENS = ['bedrooms', 'bedroom', 'bdrms', 'bdrm', 'beds', 'bed', 'br', 'bd', 'otaqlı', 'otaq', 'rooms', 'room'];
const BATHROOM_TOKENS = ['bathrooms', 'bathroom', 'baths', 'bath', 'hamam', 'wc', 'ba'];

const PRICE_MULTIPLIERS = { k: 1_000, m: 1_000_000 };

const UNDER_PREFIXES = ['less than', 'up to', 'upto', 'under', 'below', 'maximum', 'max'];
const OVER_PREFIXES  = ['more than', 'at least', 'minimum', 'above', 'over', 'from', 'min'];

const PROPERTY_TYPE_MAP = {
  apartments: 'apartment', apartment: 'apartment',
  flat: 'apartment', flats: 'apartment',
  house: 'house', houses: 'house', home: 'house',
  villa: 'villa', villas: 'villa',
  office: 'office', offices: 'office',
  commercial: 'commercial-retail',
  penthouse: 'penthouse', penthouses: 'penthouse',
  townhouse: 'townhouse', townhouses: 'townhouse',
  duplex: 'duplex', duplexes: 'duplex',
  land: 'land', plot: 'land', plots: 'land',
};

const LISTING_STATUS_MAP = {
  'for sale': 'for-sale', 'forsale': 'for-sale',
  'to buy': 'for-sale', buy: 'for-sale', sale: 'for-sale', selling: 'for-sale',
  'for rent': 'for-rent', 'forrent': 'for-rent',
  rent: 'for-rent', rental: 'for-rent', renting: 'for-rent',
  'new project': 'new-project', 'new-project': 'new-project',
  'off plan': 'new-project', offplan: 'new-project', 'off-plan': 'new-project',
};

// Baku districts and common locations
const CITY_MAP = {
  yasamal: 'Yasamal',
  nərimanov: 'Nərimanov', narimanov: 'Nərimanov',
  nəsimi: 'Nəsimi', nasimi: 'Nəsimi',
  xətai: 'Xətai', xetai: 'Xətai',
  binəqədi: 'Binəqədi', binegedi: 'Binəqədi', bineqedi: 'Binəqədi',
  sabunçu: 'Sabunçu', sabunchu: 'Sabunçu',
  'white city': 'White City', whitecity: 'White City',
  'ağ şəhər': 'White City',
  baku: 'Baku', bakı: 'Baku', baki: 'Baku',
  sumqayit: 'Sumqayıt', sumgait: 'Sumqayıt',
  ganja: 'Gəncə', gence: 'Gəncə',
};

// Noise words to strip from remaining keyword
const NOISE_WORDS = new Set([
  'a', 'an', 'the', 'with', 'and', 'or', 'in', 'near', 'around',
  'good', 'nice', 'great', 'want', 'need', 'find', 'show', 'me',
  'some', 'any', 'please', 'looking', 'for', 'property', 'properties',
  'listing', 'listings', 'place', 'somewhere', 'something',
]);

// ── Price formatter ────────────────────────────────────────────────────────────

export const formatPrice = (n) => {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v : v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${v % 1 === 0 ? v : v.toFixed(1)}k`;
  }
  return String(n);
};

const parseNumWithUnit = (numStr, unit) => {
  const n = parseFloat(numStr);
  if (isNaN(n)) return null;
  const mult = unit ? (PRICE_MULTIPLIERS[unit.toLowerCase()] || 1) : 1;
  return Math.round(n * mult);
};

// ── Main parser ────────────────────────────────────────────────────────────────

export const parseNLQuery = (rawQuery) => {
  if (!rawQuery || !rawQuery.trim()) {
    return { params: {}, interpretation: null, remainingKeyword: '' };
  }

  const params = {};
  const interpretation = [];
  let text = rawQuery.trim().toLowerCase();

  const consume = (re) => { text = text.replace(re, ' '); };

  // ── Listing status (multi-word first) ──────────────────────────────────────
  for (const [phrase, status] of Object.entries(LISTING_STATUS_MAP)) {
    const re = new RegExp(`\\b${phrase.replace(/[-\s]/g, '[\\s-]+')}\\b`, 'i');
    if (re.test(text)) {
      params.listingStatus = status;
      consume(re);
      break;
    }
  }

  // ── City / district (multi-word first) ────────────────────────────────────
  // Try multi-word entries first
  const multiWordCities = Object.entries(CITY_MAP).filter(([k]) => k.includes(' '));
  for (const [phrase, city] of multiWordCities) {
    const re = new RegExp(`\\b${phrase.replace(' ', '\\s+')}\\b`, 'i');
    if (re.test(text)) {
      params.city = city;
      interpretation.push(`in ${city}`);
      consume(re);
      break;
    }
  }
  if (!params.city) {
    for (const [word, city] of Object.entries(CITY_MAP)) {
      if (word.includes(' ')) continue;
      const re = new RegExp(`\\b${word}\\b`, 'i');
      if (re.test(text)) {
        params.city = city;
        interpretation.push(`in ${city}`);
        consume(re);
        break;
      }
    }
  }

  // ── Property type ──────────────────────────────────────────────────────────
  for (const [word, type] of Object.entries(PROPERTY_TYPE_MAP)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(text)) {
      params.propertyType = type;
      interpretation.push(type.replace('-', ' '));
      consume(re);
      break;
    }
  }

  // ── Price range "100k to 200k" or "100k-200k" ────────────────────────────
  const rangeRe = /(\d+(?:\.\d+)?)\s*(k|m)?\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(k|m)?/i;
  const rangeMatch = text.match(rangeRe);
  if (rangeMatch) {
    const low  = parseNumWithUnit(rangeMatch[1], rangeMatch[2]);
    const high = parseNumWithUnit(rangeMatch[3], rangeMatch[4]);
    if (low  != null) params.priceMin = low;
    if (high != null) params.priceMax = high;
    if (low && high) interpretation.push(`${formatPrice(low)}–${formatPrice(high)}`);
    consume(rangeRe);
  }

  // ── "under X" / "below X" ──────────────────────────────────────────────────
  if (!params.priceMax) {
    const underRe = new RegExp(
      `(?:${UNDER_PREFIXES.join('|')})\\s+(\\d+(?:\\.\\d+)?)\\s*(k|m)?`,
      'i'
    );
    const m = text.match(underRe);
    if (m) {
      const price = parseNumWithUnit(m[1], m[2]);
      if (price != null) {
        params.priceMax = price;
        interpretation.push(`under ${formatPrice(price)}`);
      }
      consume(underRe);
    }
  }

  // ── "above X" / "over X" / "from X" ──────────────────────────────────────
  if (!params.priceMin) {
    const overRe = new RegExp(
      `(?:${OVER_PREFIXES.join('|')})\\s+(\\d+(?:\\.\\d+)?)\\s*(k|m)?`,
      'i'
    );
    const m = text.match(overRe);
    if (m) {
      const price = parseNumWithUnit(m[1], m[2]);
      if (price != null) {
        params.priceMin = price;
        interpretation.push(`from ${formatPrice(price)}`);
      }
      consume(overRe);
    }
  }

  // ── Bare price "200k" (treat as max if nothing set) ──────────────────────
  if (!params.priceMin && !params.priceMax) {
    const bareRe = /\b(\d+(?:\.\d+)?)\s*(k|m)\b/i;
    const m = text.match(bareRe);
    if (m) {
      const price = parseNumWithUnit(m[1], m[2]);
      if (price != null) {
        params.priceMax = price;
        interpretation.push(`around ${formatPrice(price)}`);
      }
      consume(bareRe);
    }
  }

  // ── Bedrooms ───────────────────────────────────────────────────────────────
  // Bedroom/room tokens split into two groups for AZ offset logic
  const WESTERN_BEDROOM_TOKENS = ['bedrooms', 'bedroom', 'bdrms', 'bdrm', 'beds', 'bed', 'bdrm', 'bd'];
  // ROOM_TOKENS used implicitly via bedroomRe negation (isWesternBedroom = false path)
  // eslint-disable-next-line no-unused-vars
  const ROOM_TOKENS = ['rooms', 'room', 'otaqlı', 'otaq'];

  // Match "2br" / "3br" shorthand (always western bedroom → +1 offset)
  const brShorthandRe = /\b(\d+)br\b/i;
  const brMatch = text.match(brShorthandRe);
  if (brMatch && !params.bedrooms) {
    params.bedrooms = parseInt(brMatch[1], 10) + 1; // 2br = 3 rooms
    interpretation.push(`${params.bedrooms} rooms`);
    consume(brShorthandRe);
  }

  // Match "2 bedroom" / "2 room" / "2 otaqlı"
  const bedroomRe = /(\d+)\s*[-]?\s*(bedrooms?|bdrms?|beds?|bd|rooms?|otaqlı|otaq)\b/i;
  const bedroomMatch = text.match(bedroomRe);
  if (bedroomMatch && !params.bedrooms) {
    const count = parseInt(bedroomMatch[1], 10);
    const token = bedroomMatch[2].toLowerCase();
    const isWesternBedroom = WESTERN_BEDROOM_TOKENS.some(t => token.startsWith(t.replace(/s$/, '')));
    params.bedrooms = isWesternBedroom ? count + 1 : count; // AZ convention
    interpretation.push(`${params.bedrooms} room${params.bedrooms !== 1 ? 's' : ''}`);
    consume(bedroomRe);
  }

  // Silent: "studio" query → 1 room (Azerbaijan convention)
  if (/\bstudio\b/i.test(text) && !params.bedrooms) {
    params.bedrooms = 1;
    interpretation.push('1 room');
    consume(/\bstudio\b/i);
  }

  // ── Bathrooms ──────────────────────────────────────────────────────────────
  const bathTokenPattern = BATHROOM_TOKENS.join('|');
  const bathRe = new RegExp(`(\\d+)\\s*-?\\s*(?:${bathTokenPattern})\\b`, 'i');
  const bathMatch = text.match(bathRe);
  if (bathMatch) {
    const n = parseInt(bathMatch[1], 10);
    if (!isNaN(n)) params.bathrooms = n;
    consume(bathRe);
  }

  // ── Remaining keyword ──────────────────────────────────────────────────────
  const remainingKeyword = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1 && !NOISE_WORDS.has(w))
    .join(' ');

  const chips = [
    ...interpretation.map(label => ({ label, type: 'resolved' })),
    ...(remainingKeyword ? [{ label: remainingKeyword, type: 'uncertain' }] : []),
  ];

  return {
    params,
    chips,
    interpretation: interpretation.length > 0 ? interpretation.join(', ') : null,
    remainingKeyword,
  };
};
