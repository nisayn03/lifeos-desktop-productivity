#!/usr/bin/env node
// scripts/generate-assets.js
//
// Generates placeholder pet/UI PNGs using PNGJS so the app has real files to
// point at before hand-drawn pixel art exists. Run manually:
//
//   node scripts/generate-assets.js
//
// Each asset is a simple 32x32 colored square with a glyph-shaped cutout —
// intentionally crude; swap these files for real art whenever it's ready,
// the filenames are the actual contract the app reads from.

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'icons');

const ASSETS = {
  'walk-1.png': [0xF2, 0xA9, 0x3B],
  'walk-2.png': [0xE8, 0x9A, 0x2C],
  'study.png': [0x5B, 0x8D, 0xEF],
  'focus.png': [0xF2, 0xA9, 0x3B],
  'sleep.png': [0x6B, 0x5B, 0x95],
  'eat.png': [0xE8, 0xA0, 0xA0],
  'thinking.png': [0x8B, 0x93, 0xA1],
  'happy.png': [0x4A, 0xDE, 0x80],
  'message.png': [0xFF, 0xFF, 0xFF],
  'heart.png': [0xEF, 0x5A, 0x5A],
  'zzz.png': [0x6B, 0x5B, 0x95],
  'cookie.png': [0xC9, 0x7A, 0x2E],
  'coffee.png': [0x6F, 0x4E, 0x37],
  'tray.png': [0xF2, 0xA9, 0x3B]
};

function makeSquare(rgb, size = 32) {
  const png = new PNG({ width: size, height: size });
  const [r, g, b] = rgb;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      // simple rounded-corner mask so it doesn't look like a raw square
      const cx = size / 2, cy = size / 2;
      const dist = Math.hypot(x - cx, y - cy);
      const inside = dist < size / 2 - 1;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = inside ? 255 : 0;
    }
  }
  return png;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [filename, rgb] of Object.entries(ASSETS)) {
    const png = makeSquare(rgb);
    const outPath = path.join(OUT_DIR, filename);
    png.pack().pipe(fs.createWriteStream(outPath));
    console.log(`generated ${outPath}`);
  }
  console.log('\nDone. These are crude placeholders — swap in real pixel art under assets/icons/ whenever it exists; filenames are the contract the app reads.');
}

main();
