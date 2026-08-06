// One-off generator: rasterizes public/pwa-icon-master.svg into the PNG
// sizes required for the web app manifest, apple-touch-icon, and favicon.
// Not part of the build — run manually if the master SVG ever changes.
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const svg = readFileSync(path.join(__dirname, 'pwa-icon-master.svg'));

const targets = [
  { file: 'pwa-512.png', size: 512 },
  { file: 'pwa-192.png', size: 192 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-32.png', size: 32 },
];

for (const { file, size } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, file));
  console.log(`wrote ${file} (${size}x${size})`);
}
