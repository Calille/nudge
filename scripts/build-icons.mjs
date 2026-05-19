// Rasterises build/nudge_logo.svg into the assets electron-builder needs:
//   build/icon.ico  — Windows installer + .exe + Start Menu (multi-res)
//   build/icon.png  — BrowserWindow icon (taskbar + Alt-Tab) at 512x512
//
// Run with `npm run build:icons` if the source logo changes. The output
// files are committed so day-to-day builds don't depend on this script.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import toIco from "to-ico";

const SVG_PATH = path.join("build", "nudge_logo.svg");
const ICO_PATH = path.join("build", "icon.ico");
const PNG_PATH = path.join("build", "icon.png");

// ICO sizes Windows actually uses across DPI scales. 256 is the
// flagship; 16/32/48 are common for taskbar/file dialogs.
const ICO_SIZES = [16, 32, 48, 64, 128, 256];
const WINDOW_PNG_SIZE = 512;

async function rasterise(svg, size) {
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

const svg = await readFile(SVG_PATH);

const icoBuffers = await Promise.all(ICO_SIZES.map((s) => rasterise(svg, s)));
const ico = await toIco(icoBuffers);
await writeFile(ICO_PATH, ico);
console.log(`wrote ${ICO_PATH} (${ICO_SIZES.join(", ")} px)`);

const windowPng = await rasterise(svg, WINDOW_PNG_SIZE);
await writeFile(PNG_PATH, windowPng);
console.log(`wrote ${PNG_PATH} (${WINDOW_PNG_SIZE}x${WINDOW_PNG_SIZE})`);
