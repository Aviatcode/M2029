import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, getPixel) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (1 + stride));
  
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x / width, y / height, x, y);
      const offset = y * (1 + stride) + 1 + x * 4;
      raw[offset] = Math.min(255, Math.max(0, Math.round(r)));
      raw[offset + 1] = Math.min(255, Math.max(0, Math.round(g)));
      raw[offset + 2] = Math.min(255, Math.max(0, Math.round(b)));
      raw[offset + 3] = Math.min(255, Math.max(0, Math.round(a)));
    }
  }

  const idatData = zlib.deflateSync(raw, { level: 9 });

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = zlib.crc32(buf.slice(4, 8 + len));
    buf.writeUInt32BE(crc >>> 0, 8 + len);
    return buf;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter none
  ihdr[12] = 0; // no interlace

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Generate the M2029 Logo
function renderLogoPixel(u, v, px, py, size, isMaskable = false) {
  // Center is (0.5, 0.5), coordinates in range [-1, 1]
  const nx = (u - 0.5) * 2;
  const ny = (v - 0.5) * 2;
  const distFromCenter = Math.sqrt(nx * nx + ny * ny);

  // Background rounded squircle
  // Corner radius evaluation: |nx|^p + |ny|^p <= 1
  const p = 4.2;
  const squircle = Math.pow(Math.abs(nx), p) + Math.pow(Math.abs(ny), p);
  
  if (!isMaskable && squircle > 1.05) {
    // Transparent outside border
    return [0, 0, 0, 0];
  }

  // Deep obsidian slate background with radial cyan glow
  let bgR = 10;
  let bgG = 15;
  let bgB = 25;

  // Subtle radial glow from center
  const glow = Math.max(0, 1 - distFromCenter * 0.9);
  bgR += glow * 15;
  bgG += glow * 35;
  bgB += glow * 60;

  // Outer border glow
  if (!isMaskable && squircle > 0.88 && squircle <= 1.05) {
    const borderFactor = (squircle - 0.88) / 0.17;
    // Gradient border from cyan (0, 210, 255) to indigo (120, 100, 255)
    const t = (nx + ny + 2) / 4;
    const bColorR = 10 + t * 90;
    const bColorG = 200 - t * 80;
    const bColorB = 255;
    const alpha = (1 - Math.abs(borderFactor - 0.5) * 2) * 255;
    return [bColorR, bColorG, bColorB, Math.min(255, alpha)];
  }

  // Monogram geometry: Modern bold "M" with central apex and "2029" sub-crest
  // Let's compute Distance to the stylized "M" polygon
  // The 'M' spans x: [-0.60, 0.60], y: [-0.55, 0.35]
  const mx = nx;
  const my = ny + 0.08; // slightly offset up

  let inM = false;
  let inAccent = false;

  // Left vertical stalk: x in [-0.60, -0.38], y in [-0.55, 0.35]
  if (mx >= -0.60 && mx <= -0.38 && my >= -0.55 && my <= 0.35) inM = true;
  // Right vertical stalk: x in [0.38, 0.60], y in [-0.55, 0.35]
  if (mx >= 0.38 && mx <= 0.60 && my >= -0.55 && my <= 0.35) inM = true;

  // Left diagonal beam: from (-0.45, -0.55) to (0.0, 0.05)
  // Line eq: (mx - (-0.45)) * 0.6 - (my - (-0.55)) * 0.45 ~ distance
  const d1 = Math.abs((my - (-0.55)) - 1.33 * (mx - (-0.45)));
  if (d1 < 0.14 && mx >= -0.50 && mx <= 0.05 && my >= -0.55 && my <= 0.10) inM = true;

  // Right diagonal beam: from (0.45, -0.55) to (0.0, 0.05)
  const d2 = Math.abs((my - (-0.55)) - (-1.33) * (mx - 0.45));
  if (d2 < 0.14 && mx >= -0.05 && mx <= 0.50 && my >= -0.55 && my <= 0.10) inM = true;

  // Center crest / Diamond dot at (0, -0.22)
  if (Math.abs(mx) + Math.abs(my + 0.22) < 0.09) inAccent = true;

  // Lower subtitle bar "2029" geometric pill
  // Span x in [-0.42, 0.42], y in [0.52, 0.64]
  if (ny >= 0.52 && ny <= 0.64 && Math.abs(nx) <= 0.45) {
    inAccent = true;
  }

  if (inM) {
    // Clean bright metallic cyan-to-white gradient for "M"
    const grad = (ny + 0.6) / 1.0;
    const mr = 255 - grad * 35;
    const mg = 255 - grad * 15;
    const mb = 255;
    return [mr, mg, mb, 255];
  }

  if (inAccent) {
    // Electric Cyan-Emerald gradient
    return [34, 211, 238, 255];
  }

  return [bgR, bgG, bgB, 255];
}

// Generate the SVG version for infinite crispness
function createSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="50%" stop-color="#070a0f" />
      <stop offset="100%" stop-color="#05080d" />
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="50%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <linearGradient id="mGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="60%" stop-color="#e0f2fe" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Squircle -->
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="8" />

  <!-- Subtle Inner Ambient Glow -->
  <circle cx="256" cy="240" r="140" fill="#06b6d4" opacity="0.12" filter="url(#glow)" />

  <!-- Stylized Geometric 'M' Monogram -->
  <g fill="url(#mGrad)">
    <!-- Left Stalk -->
    <rect x="108" y="116" width="56" height="230" rx="12" />
    <!-- Right Stalk -->
    <rect x="348" y="116" width="56" height="230" rx="12" />
    <!-- Left Diagonal -->
    <polygon points="144,124 256,260 216,280 120,154" />
    <!-- Right Diagonal -->
    <polygon points="368,124 256,260 296,280 392,154" />
    <!-- Center Apex Shard -->
    <polygon points="256,220 286,264 256,300 226,264" fill="#22d3ee" filter="url(#glow)" />
  </g>

  <!-- Bottom Badge: 2029 Pill -->
  <g transform="translate(146, 382)">
    <rect x="0" y="0" width="220" height="38" rx="19" fill="#131b2e" stroke="url(#accentGrad)" stroke-width="3" />
    <text x="110" y="25" fill="#38bdf8" font-family="Plus Jakarta Sans, sans-serif" font-size="20" font-weight="800" letter-spacing="4" text-anchor="middle">2029</text>
  </g>
</svg>`;
}

// Generate all required icons
console.log('Generating M2029 official logos...');

const svg = createSvg();
fs.writeFileSync('C:/Users/Acer/Projects/m2029/M2029/public/icon.svg', svg);
console.log('✓ public/icon.svg written');

// 512x512
const png512 = createPng(512, 512, (u, v, x, y) => renderLogoPixel(u, v, x, y, 512, false));
fs.writeFileSync('C:/Users/Acer/Projects/m2029/M2029/public/icon-512.png', png512);
fs.writeFileSync('C:/Users/Acer/Projects/m2029/M2029/public/pwa-512x512.png', png512);
console.log('✓ icon-512.png & pwa-512x512.png written');

// 512x512 Maskable
const pngMaskable = createPng(512, 512, (u, v, x, y) => renderLogoPixel(u, v, x, y, 512, true));
fs.writeFileSync('C:/Users/Acer/Projects/m2029/M2029/public/pwa-maskable-512x512.png', pngMaskable);
console.log('✓ pwa-maskable-512x512.png written');

// 192x192
const png192 = createPng(192, 192, (u, v, x, y) => renderLogoPixel(u, v, x, y, 192, false));
fs.writeFileSync('C:/Users/Acer/Projects/m2029/M2029/public/icon-192.png', png192);
fs.writeFileSync('C:/Users/Acer/Projects/m2029/M2029/public/pwa-192x192.png', png192);
console.log('✓ icon-192.png & pwa-192x192.png written');

// 180x180 apple-touch-icon
const png180 = createPng(180, 180, (u, v, x, y) => renderLogoPixel(u, v, x, y, 180, false));
fs.writeFileSync('C:/Users/Acer/Projects/m2029/M2029/public/apple-touch-icon.png', png180);
console.log('✓ apple-touch-icon.png written');

// 32x32 Favicon
const png32 = createPng(32, 32, (u, v, x, y) => renderLogoPixel(u, v, x, y, 32, false));
fs.writeFileSync('C:/Users/Acer/Projects/m2029/M2029/public/favicon-32.png', png32);
fs.writeFileSync('C:/Users/Acer/Projects/m2029/M2029/public/favicon.ico', png32);
console.log('✓ favicon-32.png & favicon.ico written');

console.log('All M2029 icons generated successfully!');

