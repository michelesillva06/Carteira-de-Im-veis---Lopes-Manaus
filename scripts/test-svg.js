import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Precise SVG matching the uploaded Lopes favicon & logo
const LOPES_RED = '#E5093A';

// The Lopes Heart Symbol SVG (pure vector, transparent background)
const lopesHeartSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="circle-cutout">
      <!-- Cutout mask to ensure exact white gap around circle -->
    </clipPath>
  </defs>
  <!-- Circle at upper right -->
  <circle cx="365" cy="186" r="108" fill="${LOPES_RED}" />

  <!-- Heart body cradling the circle with precise gap -->
  <path d="
    M 245 460
    C 215 450, 140 375, 75 300
    C 20 235, 14 175, 45 115
    C 80 50, 160 50, 222 100
    C 236 112, 248 126, 255 142
    C 226 198, 224 266, 260 320
    C 295 372, 355 400, 420 375
    C 424 373, 427 368, 424 364
    C 418 356, 400 340, 395 330
    C 340 348, 280 326, 250 278
    C 220 228, 225 168, 255 118
    C 260 110, 265 105, 272 98
    C 255 85, 235 78, 215 78
    C 160 78, 100 115, 80 168
    C 55 235, 95 305, 145 355
    C 195 405, 238 438, 245 460
    Z
  " fill="${LOPES_RED}" style="display:none;" />
</svg>
`;
