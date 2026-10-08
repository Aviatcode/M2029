import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, getPixel) {
  // Simple PNG encoder using Node zlib
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // color type RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with filter type 0 (none) for each row
  const rowStride = width * 4;
  const rawData = Buffer.alloc(height * (rowStride + 1));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);

  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// CRC32 implementation for PNG
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }

  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function renderStudyIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.44;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background gradient: dark navy to deep sapphire / electric blue
  const t = (x + y) / (w + h);
  let r = Math.round(15 + t * 25);
  let g = Math.round(23 + t * 80);
  let b = Math.round(42 + t * 160);
  let a = 255;

  if (!isMaskable && dist > radius + 1) {
    // rounded badge boundary
    return [0, 0, 0, 0];
  }

  // Draw central glowing graduation mortarboard / syllabus notebook motif
  const scale = w / 512;
  const nx = (x - cx) / scale;
  const ny = (y - cy) / scale;

  // Diamond cap shape: |nx| / 120 + |ny + 10| / 50 < 1
  if (Math.abs(nx) / 120 + Math.abs(ny + 15) / 50 <= 1) {
    return [255, 255, 255, 255]; // Cap diamond
  }

  // Cap base
  if (nx >= -60 && nx <= 60 && ny >= -15 && ny <= 25) {
    return [30, 41, 59, 255];
  }

  // Golden Tassel
  if (nx >= 20 && nx <= 90 && Math.abs(ny - (nx * 0.3 - 5)) < 6) {
    return [251, 191, 36, 255]; // Gold
  }

  // Book / Folder page
  if (nx >= -110 && nx <= 110 && ny >= 35 && ny <= 100) {
    if (ny < 45 || ny > 90 || Math.abs(nx) > 100) {
      return [56, 189, 248, 255]; // cyan folder edge
    }
    // Notebook lines
    if (Math.abs(ny - 58) < 2 || Math.abs(ny - 72) < 2) {
      return [148, 163, 184, 255];
    }
    return [241, 245, 249, 255]; // paper
  }

  // Morning sun star at top right
  const sx = nx - 120;
  const sy = ny + 100;
  if (Math.sqrt(sx * sx + sy * sy) < 22) {
    return [251, 191, 36, 255];
  }

  return [r, g, b, a];
}

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, { recursive: true });

// 192x192
const pwa192 = createPNG(192, 192, (x, y, w, h) => renderStudyIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

// 512x512
const pwa512 = createPNG(512, 512, (x, y, w, h) => renderStudyIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

// 512x512 maskable (full bleed background)
const pwaMaskable = createPNG(512, 512, (x, y, w, h) => renderStudyIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);

// 180x180 apple-touch-icon
const appleTouch = createPNG(180, 180, (x, y, w, h) => renderStudyIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

console.log('✅ Icons successfully generated in public/ directory!');
