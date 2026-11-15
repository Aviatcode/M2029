import fs from 'fs';
import path from 'path';

const root = 'C:/Users/Acer/Projects/m2029/M2029';
const sourceFile = fs.existsSync(path.join(root, 'public/decoded_am_logo.png'))
  ? path.join(root, 'public/decoded_am_logo.png')
  : path.join(root, 'public/am-logo.png');
const amLogoBuf = fs.readFileSync(sourceFile);

if (amLogoBuf.length !== 50715) {
  throw new Error(`Unexpected logo size: ${amLogoBuf.length}`);
}

const targets = [
  'public/am-logo.png',
  'public/app-logo.png',
  'public/icon-512.png',
  'public/icon-192.png',
  'public/apple-touch-icon.png',
  'public/pwa-512x512.png',
  'public/pwa-192x192.png',
  'public/pwa-maskable-512x512.png',
  'public/favicon-32.png',
  'public/favicon.ico',
];

for (const t of targets) {
  fs.writeFileSync(path.join(root, t), amLogoBuf);
  console.log(`Updated ${t} (${amLogoBuf.length} bytes)`);
}

// Generate SVG
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="512" height="512">
  <rect width="120" height="120" rx="26" fill="#000000"/>
  <rect x="0.75" y="0.75" width="118.5" height="118.5" rx="25.25" fill="none" stroke="#262626" stroke-width="1.5"/>
  <g fill="none" stroke="#FFFFFF" stroke-width="6.5" stroke-linecap="square">
    <!-- Letter A -->
    <path d="M 21 86 L 38 34 L 55 86" stroke-linejoin="miter" stroke-miterlimit="10"/>
    <line x1="28" y1="67" x2="48" y2="67"/>
    <!-- Letter M -->
    <path d="M 67 86 L 67 34 L 85 80 L 103 34 L 103 86" stroke-linejoin="miter" stroke-miterlimit="10"/>
  </g>
</svg>
`;

fs.writeFileSync(path.join(root, 'public/icon.svg'), svg, 'utf-8');
fs.writeFileSync(path.join(root, 'public/am-logo.svg'), svg, 'utf-8');
console.log('Updated public/icon.svg and public/am-logo.svg');

