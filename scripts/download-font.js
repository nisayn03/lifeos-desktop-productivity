#!/usr/bin/env node
// scripts/download-font.js
//
// Downloads the app's Google Fonts (Space Grotesk, Inter, JetBrains Mono) and
// caches them under assets/fonts/ so the app can @font-face them locally
// instead of depending on network access at runtime (fine for offline-first
// use on a laptop with wifi off).
//
// This script needs internet access to run, which was not available in the
// environment this project was built in — it has been written and is ready
// to run, but not executed or tested. Run it once when you have a
// connection:
//
//   node scripts/download-font.js
//
// Until then, styles.css already falls back to system fonts (Segoe UI /
// Consolas etc.) so the app looks correct either way — just less
// distinctive without the real typefaces.

const https = require('https');
const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');

// Google Fonts CSS2 endpoints resolve to versioned woff2 URLs that change
// over time, so we fetch the CSS first and parse out the actual font URLs
// rather than hardcoding them.
const FAMILIES = [
  { name: 'Space Grotesk', css: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap' },
  { name: 'Inter', css: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap' },
  { name: 'JetBrains Mono', css: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap' }
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LifeOS-font-fetch)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(res.headers.location));
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function downloadFamily(family) {
  console.log(`Fetching CSS for ${family.name}...`);
  const css = await get(family.css);
  const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g)].map(m => m[1]);
  if (!urls.length) {
    console.warn(`  no font file URLs found for ${family.name} — Google may have changed the CSS format.`);
    return;
  }
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  for (let i = 0; i < urls.length; i++) {
    const dest = path.join(FONTS_DIR, `${family.name.replace(/\s+/g, '-')}-${i}.woff2`);
    const buf = await new Promise((resolve, reject) => {
      https.get(urls[i], (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });
    fs.writeFileSync(dest, buf);
    console.log(`  saved ${dest}`);
  }
}

async function main() {
  for (const family of FAMILIES) {
    try {
      await downloadFamily(family);
    } catch (err) {
      console.error(`Failed to download ${family.name}:`, err.message);
    }
  }
  console.log('\nDone. Add matching @font-face rules to styles.css pointing at assets/fonts/*.woff2 to use these instead of the system-font fallback.');
}

main();
