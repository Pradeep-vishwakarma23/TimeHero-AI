import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const BRANDING_DIR = path.resolve(process.cwd(), 'public/branding');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

// Create directories if they do not exist
if (!fs.existsSync(BRANDING_DIR)) {
  fs.mkdirSync(BRANDING_DIR, { recursive: true });
}

async function generate() {
  console.log('Starting branding assets generation with sharp...');

  const logoSvgPath = path.join(BRANDING_DIR, 'logo.svg');
  const logoDarkSvgPath = path.join(BRANDING_DIR, 'logo-dark.svg');
  const logoLightSvgPath = path.join(BRANDING_DIR, 'logo-light.svg');
  const logoMarkSvgPath = path.join(BRANDING_DIR, 'logo-mark.svg');

  // Verify sources exist
  if (!fs.existsSync(logoSvgPath) || !fs.existsSync(logoMarkSvgPath)) {
    throw new Error('Source SVG files not found. Ensure logo.svg and logo-mark.svg are in public/branding');
  }

  // 1. Generate full logo PNGs (512 width, height proportional from 600x650 SVG -> 512x554)
  console.log('Generating full logo PNGs...');
  await sharp(logoSvgPath)
    .resize(512)
    .png()
    .toFile(path.join(BRANDING_DIR, 'logo.png'));

  await sharp(logoDarkSvgPath)
    .resize(512)
    .png()
    .toFile(path.join(BRANDING_DIR, 'logo-dark.png'));

  await sharp(logoLightSvgPath)
    .resize(512)
    .png()
    .toFile(path.join(BRANDING_DIR, 'logo-light.png'));

  // 2. Generate Favicons (32x32, 16x16) and Apple Touch Icon (180x180) from logo-mark.svg
  console.log('Generating favicon assets...');
  
  // favicon-32.png / favicon-32x32.png
  await sharp(logoMarkSvgPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(BRANDING_DIR, 'favicon-32.png'));
  
  await sharp(logoMarkSvgPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));

  // favicon-16.png / favicon-16x16.png
  await sharp(logoMarkSvgPath)
    .resize(16, 16)
    .png()
    .toFile(path.join(BRANDING_DIR, 'favicon-16.png'));

  await sharp(logoMarkSvgPath)
    .resize(16, 16)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon-16x16.png'));

  // favicon.ico (rename 32x32 PNG, widely supported by all modern browsers)
  await sharp(logoMarkSvgPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(BRANDING_DIR, 'favicon.ico'));

  await sharp(logoMarkSvgPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon.ico'));

  // apple-touch-icon.png
  await sharp(logoMarkSvgPath)
    .resize(180, 180)
    .png()
    .toFile(path.join(BRANDING_DIR, 'apple-touch-icon.png'));

  await sharp(logoMarkSvgPath)
    .resize(180, 180)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  console.log('Branding assets generated successfully!');
}

generate().catch(err => {
  console.error('Failed to generate assets:', err);
  process.exit(1);
});
