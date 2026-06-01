const https = require('https');
const http  = require('http');
const sharp = require('sharp');

/**
 * Fetch a URL into a Buffer using only Node.js built-ins.
 * Follows a single redirect.
 */
function fetchBuffer(url, timeout = 6000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout }, (res) => {
      // Follow one redirect
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return fetchBuffer(res.headers.location, timeout).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
  });
}

/**
 * dHash (difference hash) — 8×8 = 64-bit hash.
 * Resize image to 9×8 greyscale, compare adjacent columns per row.
 * Returns a 16-char hex string, or null on failure.
 */
async function dHash(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const idx = row * 9 + col;
      bits += data[idx] < data[idx + 1] ? '1' : '0';
    }
  }

  // Pack 64 bits into 16 hex chars
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/**
 * Hamming distance between two 16-char hex hashes (64-bit comparison).
 * Returns 64 if lengths differ.
 */
function hammingDistance(hexA, hexB) {
  if (!hexA || !hexB || hexA.length !== hexB.length) return 64;
  let dist = 0;
  for (let i = 0; i < hexA.length; i++) {
    const xor = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    // count set bits
    let x = xor;
    while (x) { dist += x & 1; x >>= 1; }
  }
  return dist;
}

/**
 * Hash a property image from its URL or object {thumbnail, medium, large}.
 * Returns hex hash string or null.
 */
async function hashPropertyImage(image) {
  try {
    let url = null;
    if (typeof image === 'string') url = image;
    else if (typeof image === 'object' && image) {
      url = image.medium || image.thumbnail || image.large || image.full;
    }
    if (!url || !url.startsWith('http')) return null;

    const buffer = await fetchBuffer(url);
    return await dHash(buffer);
  } catch (err) {
    console.error('[imageHash] Failed to hash image:', err.message);
    return null;
  }
}

/**
 * Hash the first N images of a property (default 3).
 * Returns array of hex hash strings (nulls filtered out).
 */
async function hashPropertyImages(images, maxImages = 3) {
  if (!images?.length) return [];
  const subset = images.slice(0, maxImages);
  const hashes = await Promise.all(subset.map(hashPropertyImage));
  return hashes.filter(Boolean);
}

module.exports = { dHash, hammingDistance, hashPropertyImages };
