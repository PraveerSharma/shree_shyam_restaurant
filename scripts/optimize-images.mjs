// ============================================
// Image Optimization Script
// Compresses PNG images in public/images/
// Run: node scripts/optimize-images.mjs
// ============================================

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const DIRS = ['public/images/sweets', 'public/images/restaurant'];
const MAX_WIDTH = 800;
const QUALITY = 80;

async function getFiles(dir) {
  const entries = await readdir(dir);
  return entries.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
}

async function optimizeImage(filePath) {
  const before = (await stat(filePath)).size;

  const buffer = await sharp(filePath)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .png({ quality: QUALITY, compressionLevel: 9, palette: true })
    .toBuffer();

  const after = buffer.length;

  if (after < before) {
    await sharp(buffer).toFile(filePath);
    const saved = ((before - after) / before * 100).toFixed(1);
    console.log(`  ${filePath}: ${(before/1024).toFixed(0)}KB → ${(after/1024).toFixed(0)}KB (${saved}% saved)`);
    return before - after;
  } else {
    console.log(`  ${filePath}: already optimized`);
    return 0;
  }
}

async function main() {
  console.log('Optimizing images...\n');
  let totalSaved = 0;
  let count = 0;

  for (const dir of DIRS) {
    console.log(`\n${dir}/`);
    const files = await getFiles(dir);
    for (const file of files) {
      const saved = await optimizeImage(join(dir, file));
      totalSaved += saved;
      count++;
    }
  }

  // Also optimize hero and logo
  for (const file of ['public/images/hero-bg.png', 'public/images/logo.png']) {
    try {
      const saved = await optimizeImage(file);
      totalSaved += saved;
      count++;
    } catch (e) {
      console.log(`  ${file}: skipped (${e.message})`);
    }
  }

  console.log(`\nDone! Optimized ${count} images, saved ${(totalSaved / 1024 / 1024).toFixed(2)}MB total.`);
}

main().catch(console.error);
