import fs from 'fs';
import path from 'path';

const root = 'C:/Users/Acer/Projects/m2029/M2029';
const amLogoBuf = fs.readFileSync(path.join(root, 'public/decoded_am_logo.png'));

if (amLogoBuf.length !== 50715) {
  throw new Error(`Unexpected logo size: ${amLogoBuf.length}`);
}

const targets = [
  'public/am-logo.png',
  'public/icon-512.png',
  'public/icon-192.png',
  'public/apple-touch-icon.png',
  'public/pwa-512x512.png',
  'public/pwa-192x192.png',
  'public/pwa-maskable-512x512.png',
];

for (const t of targets) {
  fs.writeFileSync(path.join(root, t), amLogoBuf);
  console.log(`Updated ${t} (${amLogoBuf.length} bytes)`);
}

// Generate SVG
const b64 = amLogoBuf.toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image width="512" height="512" href="data:image/png;base64,${b64}"/>
</svg>
`;

fs.writeFileSync(path.join(root, 'public/icon.svg'), svg, 'utf-8');
fs.writeFileSync(path.join(root, 'public/am-logo.svg'), svg, 'utf-8');
console.log('Updated public/icon.svg and public/am-logo.svg');

