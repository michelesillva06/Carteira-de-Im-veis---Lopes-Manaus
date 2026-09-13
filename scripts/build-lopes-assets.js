import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const LOPES_RED = '#E5093A';

// Mathematical model of the official Lopes symbol
function getLopesSymbolSvg(size = 512, padding = 32, bg = null) {
  const contentSize = size - padding * 2;
  const scale = contentSize / 512;
  const tx = padding;
  const ty = padding;

  // Exact coordinates matching the uploaded favicon-lopes.png:
  // Circle: cx=372, cy=180, r=106
  // Gap: width 28, so inner cutout radius is 134 around (372, 180)
  // Heart left lobe: (246, 460) -> (18, 235) -> (115, 78) -> (238, 140)
  // Arc around (372, 180) with r=134 from (238, 140) down to (424, 332)
  // Outer wing corner at (424, 332), curving back to (246, 460)
  
  const bgRect = bg ? `<rect width="${size}" height="${size}" rx="${size > 200 ? 64 : 16}" fill="${bg}" />` : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${bgRect}
  <g transform="translate(${tx}, ${ty}) scale(${scale})">
    <!-- Solid Red Circle -->
    <circle cx="372" cy="180" r="106" fill="${LOPES_RED}" />
    
    <!-- Heart Body Cradling Circle -->
    <path d="
      M 246 460
      C 195 440, 105 350, 48 280
      C 12 232, 10 178, 38 128
      C 72 68, 150 62, 206 102
      C 224 114, 236 128, 246 146
      A 134 134 0 0 0 424 332
      C 426 332, 420 338, 412 344
      C 365 385, 305 432, 246 460
      Z
    " fill="${LOPES_RED}" />
  </g>
</svg>
`;
}

// Logo Lopes with Heart + "Lopes" text SVG matching Logo-Lopes-Consultoria-de-Imoveis-2020.png
function getLopesLogoSvg(width = 600, height = 240, textColor = LOPES_RED) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="${width}" height="${height}">
  <!-- Heart Icon on Left -->
  <g transform="translate(20, 20) scale(0.39)">
    <circle cx="372" cy="180" r="106" fill="${LOPES_RED}" />
    <path d="
      M 246 460
      C 195 440, 105 350, 48 280
      C 12 232, 10 178, 38 128
      C 72 68, 150 62, 206 102
      C 224 114, 236 128, 246 146
      A 134 134 0 0 0 424 332
      C 426 332, 420 338, 412 344
      C 365 385, 305 432, 246 460
      Z
    " fill="${LOPES_RED}" />
  </g>

  <!-- Lopes Bold Modern Typography -->
  <g fill="${textColor}">
    <!-- L -->
    <path d="M 222 92 L 244 92 L 244 142 L 272 142 L 272 158 L 222 158 Z" />
    <!-- o -->
    <path d="
      M 314 112
      C 298 112, 286 124, 286 140
      C 286 156, 298 168, 314 168
      C 330 168, 342 156, 342 140
      C 342 124, 330 112, 314 112 Z
      M 314 126
      C 322 126, 328 132, 328 140
      C 328 148, 322 154, 314 154
      C 306 154, 300 148, 300 140
      C 300 132, 306 126, 314 126 Z
    " />
    <!-- p -->
    <path d="
      M 356 114 L 370 114 L 370 123
      C 374 116, 382 112, 392 112
      C 408 112, 419 124, 419 140
      C 419 156, 408 168, 392 168
      C 382 168, 374 164, 370 157
      L 370 190 L 356 190 Z
      M 387 126
      C 378 126, 370 133, 370 140
      C 370 147, 378 154, 387 154
      C 396 154, 404 147, 404 140
      C 404 133, 396 126, 387 126 Z
    " />
    <!-- e -->
    <path d="
      M 460 141
      C 460 126, 450 112, 435 112
      C 420 112, 409 124, 409 140
      C 409 156, 420 168, 436 168
      C 448 168, 457 161, 460 151
      L 446 148
      C 444 153, 440 156, 436 156
      C 429 156, 424 150, 423 143
      L 460 143
      C 460 142, 460 141, 460 141 Z
      M 424 133
      C 426 127, 430 123, 435 123
      C 440 123, 445 127, 446 133 Z
    " />
    <!-- s -->
    <path d="
      M 473 154
      C 475 156, 479 158, 484 158
      C 489 158, 493 156, 493 152
      C 493 147, 487 145, 480 143
      C 471 140, 466 135, 466 127
      C 466 118, 474 112, 484 112
      C 491 112, 497 115, 501 120
      L 492 127
      C 490 124, 487 123, 484 123
      C 480 123, 477 125, 477 128
      C 477 132, 482 134, 489 136
      C 499 139, 504 145, 504 153
      C 504 163, 495 169, 484 169
      C 476 169, 469 165, 464 158 Z
    " />
  </g>
</svg>
`;
}

// Write SVG files and render PNGs
async function generateAllAssets() {
  const publicDir = path.resolve('public');
  const assetsDir = path.resolve('public/assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  console.log('Generating SVGs...');
  const iconSvg = getLopesSymbolSvg(512, 24);
  const logoSvg = getLopesLogoSvg(600, 240, LOPES_RED);
  const logoWhiteSvg = getLopesLogoSvg(600, 240, '#FFFFFF');

  fs.writeFileSync(path.join(publicDir, 'icon.svg'), iconSvg.trim());
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), iconSvg.trim());
  fs.writeFileSync(path.join(publicDir, 'logo-lopes.svg'), logoSvg.trim());
  fs.writeFileSync(path.join(publicDir, 'logo-lopes-white.svg'), logoWhiteSvg.trim());
  fs.writeFileSync(path.join(assetsDir, 'logo-lopes.svg'), logoSvg.trim());

  console.log('Rendering high-res PNG icons with sharp...');
  
  // Favicon (64x64)
  await sharp(Buffer.from(iconSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon-lopes.png'));

  // Copy to assets
  fs.copyFileSync(
    path.join(publicDir, 'favicon-lopes.png'),
    path.join(assetsDir, 'favicon-lopes.png')
  );

  // Apple Touch Icon (180x180) - iOS safari standard with clean safe padding
  const appleTouchSvg = getLopesSymbolSvg(180, 16, '#FFFFFF');
  await sharp(Buffer.from(appleTouchSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // PWA 192x192
  await sharp(Buffer.from(getLopesSymbolSvg(192, 12)))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // PWA 512x512
  await sharp(Buffer.from(getLopesSymbolSvg(512, 32)))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // PWA Maskable 512x512 (with 15% safe margin on all sides and full-bleed white background)
  // safe zone: Android clips up to 20% outer ring
  const maskableSvg = getLopesSymbolSvg(512, 76, '#FFFFFF');
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Logo PNG (400x160)
  await sharp(Buffer.from(logoSvg))
    .resize(600, 240)
    .png()
    .toFile(path.join(publicDir, 'logo-lopes.png'));

  fs.copyFileSync(
    path.join(publicDir, 'logo-lopes.png'),
    path.join(assetsDir, 'logo-lopes.png')
  );

  console.log('All PWA and Logo assets generated successfully!');
}

generateAllAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
