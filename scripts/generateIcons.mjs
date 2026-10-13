import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const iconsDir = path.join(projectRoot, 'build', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Crisp, modern SVG for Terminal Manager icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141820"/>
      <stop offset="100%" stop-color="#090B0E"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6C8CFF"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
    <linearGradient id="promptGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#A78BFA"/>
    </linearGradient>
    <linearGradient id="cursorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ADE80"/>
      <stop offset="100%" stop-color="#22C55E"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Outer Rounded Shell with Drop Shadow -->
  <rect x="32" y="32" width="448" height="448" rx="96" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="12" filter="url(#shadow)"/>

  <!-- Top Window Header Bar -->
  <path d="M 38 128 L 474 128" stroke="rgba(255, 255, 255, 0.08)" stroke-width="2"/>

  <!-- Window Header Control Dots -->
  <circle cx="88" cy="80" r="14" fill="#EF4444" opacity="0.85"/>
  <circle cx="132" cy="80" r="14" fill="#FBBF24" opacity="0.85"/>
  <circle cx="176" cy="80" r="14" fill="#10B981" opacity="0.85"/>

  <!-- Terminal Prompt Symbol: > -->
  <path d="M 120 220 L 210 290 L 120 360" fill="none" stroke="url(#promptGrad)" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Terminal Underscore / Block Cursor: _ -->
  <rect x="250" y="336" width="130" height="26" rx="10" fill="url(#cursorGrad)"/>
</svg>`;

// Tray-specific simplified icon (ultra-crisp for 16px and 32px display)
const traySvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect x="4" y="6" width="56" height="52" rx="10" fill="#11141A" stroke="#6C8CFF" stroke-width="3"/>
  <path d="M 16 26 L 28 36 L 16 46" fill="none" stroke="#60A5FA" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="34" y="42" width="16" height="4" rx="2" fill="#4ADE80"/>
</svg>`;

const svgPath = path.join(iconsDir, 'icon.svg');
const traySvgPath = path.join(iconsDir, 'tray.svg');
fs.writeFileSync(svgPath, svgContent, 'utf8');
fs.writeFileSync(traySvgPath, traySvgContent, 'utf8');

const SIZES = [16, 24, 32, 48, 64, 128, 256, 512];

async function generate() {
  console.log('Generating PNG and ICO icons via Playwright...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const pngBuffers = {};

  for (const size of SIZES) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">${svgContent}</body></html>`);
    const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    const buf = await page.screenshot({ type: 'png', omitBackground: true });
    fs.writeFileSync(pngPath, buf);
    pngBuffers[size] = buf;
    console.log(`✓ Generated ${pngPath}`);
  }

  // Generate 256px as standard icon.png
  fs.writeFileSync(path.join(iconsDir, 'icon.png'), pngBuffers[256]);

  // Generate tray icons (16x16, 32x32)
  for (const size of [16, 32]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">${traySvgContent}</body></html>`);
    const trayPath = path.join(iconsDir, size === 16 ? 'tray.png' : 'tray@2x.png');
    const buf = await page.screenshot({ type: 'png', omitBackground: true });
    fs.writeFileSync(trayPath, buf);
    console.log(`✓ Generated ${trayPath}`);
  }

  await browser.close();

  // Create multi-resolution ICO file containing sizes: 16, 24, 32, 48, 64, 128, 256
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoPath = path.join(iconsDir, 'icon.ico');
  const count = icoSizes.length;

  // Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved (0)
  header.writeUInt16LE(1, 2); // Type 1 = Icon
  header.writeUInt16LE(count, 4); // Count of images

  let offset = 6 + count * 16;
  const entries = [];
  const images = [];

  for (const size of icoSizes) {
    const imgBuf = pngBuffers[size];
    images.push(imgBuf);

    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // Color count
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel (32-bit RGBA)
    entry.writeUInt32LE(imgBuf.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Image data offset

    entries.push(entry);
    offset += imgBuf.length;
  }

  const finalIco = Buffer.concat([header, ...entries, ...images]);
  fs.writeFileSync(icoPath, finalIco);
  console.log(`✓ Successfully generated multi-size Windows icon: ${icoPath} (${finalIco.length} bytes)`);
}

generate().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
