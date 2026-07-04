// One-off script: generate app/favicon.ico from app/icon.svg.
// Usage: bun run scripts/gen-favicon.ts
//
// Produces a proper multi-resolution .ico file (16, 32, 48) from the brand
// SVG. Next.js auto-serves app/favicon.ico at /favicon.ico.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const APP_DIR = join(process.cwd(), "app");
const svgPath = join(APP_DIR, "icon.svg");
const outPath = join(APP_DIR, "favicon.ico");

const svg = readFileSync(svgPath);

// ICO file format: header + directory entries + image data.
// We embed PNG-encoded images (ICO supports PNG since Windows Vista).
const sizes = [16, 32, 48];
const pngs: Buffer[] = [];
for (const size of sizes) {
  const png = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain" })
    .png()
    .toBuffer();
  pngs.push(png);
}

// Header: 6 bytes
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: 1 = icon
header.writeUInt16LE(pngs.length, 4); // count

// Each directory entry: 16 bytes
const dirSize = 16;
const dirTotal = dirSize * pngs.length;
const headerAndDirSize = 6 + dirTotal;
const dirEntries: Buffer[] = [];
let dataOffset = headerAndDirSize;
for (let i = 0; i < pngs.length; i++) {
  const size = sizes[i];
  const png = pngs[i];
  const entry = Buffer.alloc(dirSize);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.byteLength, 8); // image size
  entry.writeUInt32LE(dataOffset, 12); // offset
  dirEntries.push(entry);
  dataOffset += png.byteLength;
}

const ico = Buffer.concat([header, ...dirEntries, ...pngs]);
writeFileSync(outPath, ico);
console.log(`Wrote ${outPath} (${ico.byteLength} bytes, ${pngs.length} sizes)`);
