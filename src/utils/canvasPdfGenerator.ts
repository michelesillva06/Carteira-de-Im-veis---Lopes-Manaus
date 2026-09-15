import jsPDF from "jspdf";
import { PropertyListing, BrokerProfile } from "../types";
import { formatCurrency } from "../data/manaustowns";
import { translateAmenitiesList } from "./amenitiesTranslator";
import { generatePdfSummary } from "./descriptionFormatter";

/**
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * The previous PDF pipeline (see pdfGenerator.ts) cloned the live HTML/CSS of
 * each page and rasterized it with html2canvas. That approach has to: clone a
 * large DOM tree, resolve every CSS rule (Tailwind's oklch/color-mix colors,
 * gradients, shadows...), sanitize colors html2canvas can't parse, and only
 * then paint pixel-by-pixel — all of which is slow and fragile.
 *
 * This file instead draws every page directly on an HTML5 Canvas using plain
 * Canvas 2D commands (fillRect, fillText, drawImage, roundRect...). There is
 * no HTML, no CSS, and nothing to clone or sanitize, so generation is close
 * to instant regardless of how many properties are in the catalog. This
 * mirrors the architecture already proven fast in the other Lopes catalog
 * project (GERADOR-DE-CATALOGOS---LOPES).
 * ---------------------------------------------------------------------------
 */

export interface PDFGenerationProgress {
  currentPage: number;
  totalPages: number;
  status: string;
}

// A4 portrait at ~10px/mm (comparable density to the other project's landscape
// canvases) — sharp enough for print/screen while staying fast to draw.
const CANVAS_W = 2100;
const CANVAS_H = 2970;

const LOPES_RED = "#e11d48"; // rose-600
const LOPES_ROSE_500 = "#f43f5e";
const NAVY_950 = "#020617"; // slate-950
const SLATE_900 = "#0f172a";
const SLATE_800 = "#1e293b";
const SLATE_700 = "#334155";
const SLATE_500 = "#64748b";
const SLATE_400 = "#94a3b8";
const SLATE_300 = "#cbd5e1";
const SLATE_200 = "#e2e8f0";
const SLATE_100 = "#f1f5f9";
const SLATE_50 = "#f8fafc";
const BLUE_600 = "#2563eb";

const FONT = "sans-serif";

// ---------------------------------------------------------------------------
// Image loading (same tiered strategy as the working project: try a direct
// CORS-friendly load first, then a manual CORS fetch, then our own proxy,
// then a clean generated placeholder — the canvas is NEVER left tainted).
// ---------------------------------------------------------------------------

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function createFallbackImage(w = 1200, h = 800): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, SLATE_700);
      grad.addColorStop(1, SLATE_900);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = LOPES_RED;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 30, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(h * 0.045)}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("Lopes Manaus", w / 2, h / 2 + 30);
      ctx.textAlign = "left";
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = canvas.toDataURL("image/jpeg", 0.9);
  });
}

function loadFromUrl(url: string, crossOrigin: boolean): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function isCanvasSafe(img: HTMLImageElement): boolean {
  try {
    const t = document.createElement("canvas");
    t.width = 2;
    t.height = 2;
    const ctx = t.getContext("2d");
    if (!ctx) return true;
    ctx.drawImage(img, 0, 0, 2, 2);
    t.toDataURL("image/png");
    return true;
  } catch {
    return false;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}

async function loadImageUncached(src?: string | null): Promise<HTMLImageElement> {
  if (!src || !src.trim()) return createFallbackImage();
  const clean = src.trim();

  if (clean.startsWith("data:") || clean.startsWith("blob:")) {
    const img = await loadFromUrl(clean, false);
    return img || createFallbackImage();
  }

  // 1. Direct crossOrigin load — works whenever the photo host sends CORS headers.
  try {
    const direct = await loadFromUrl(clean, true);
    if (direct && isCanvasSafe(direct)) return direct;
  } catch {}

  // 2. Manual CORS fetch + blob (covers hosts that need an explicit fetch).
  try {
    const res = await fetch(clean, { mode: "cors" });
    if (res.ok) {
      const dataUrl = await blobToDataUrl(await res.blob());
      if (dataUrl) {
        const img = await loadFromUrl(dataUrl, false);
        if (img && isCanvasSafe(img)) return img;
      }
    }
  } catch {}

  // 3. Fall back to our own proxy (always sets correct CORS headers).
  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(clean)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const dataUrl = await blobToDataUrl(await res.blob());
      if (dataUrl) {
        const img = await loadFromUrl(dataUrl, false);
        if (img && isCanvasSafe(img)) return img;
      }
    }
  } catch {}

  // 4. Clean generated placeholder — canvas is never tainted.
  return createFallbackImage();
}

function loadImageSafely(src?: string | null): Promise<HTMLImageElement> {
  const key = src && src.trim() ? src.trim() : "__fallback__";
  const cached = imageCache.get(key);
  if (cached) return cached;
  const promise = loadImageUncached(src);
  imageCache.set(key, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawRoundedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();

  if (img && img.width && img.height) {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let renderW = w;
    let renderH = h;
    let offsetX = 0;
    let offsetY = 0;
    if (imgRatio > boxRatio) {
      renderW = h * imgRatio;
      offsetX = -(renderW - w) / 2;
    } else {
      renderH = w / imgRatio;
      offsetY = -(renderH - h) / 2;
    }
    ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);
  } else {
    ctx.fillStyle = SLATE_200;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill: string,
  stroke?: string,
  lineWidth = 2
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/** Pixel-perfect Lopes heart emblem, drawn as a vector path (no image asset needed). */
function drawLopesHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 100;
  ctx.scale(scale, scale);
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(75, 28, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(46, 92);
  ctx.bezierCurveTo(25, 74, 2, 52, 2, 30);
  ctx.bezierCurveTo(2, 12, 16, 0, 34, 0);
  ctx.bezierCurveTo(44, 0, 52, 5, 57, 14);
  ctx.bezierCurveTo(52, 23, 50, 33, 53, 43);
  ctx.bezierCurveTo(57, 55, 67, 62, 76, 62);
  ctx.bezierCurveTo(68, 76, 57, 86, 46, 92);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

interface LinkRect {
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// COVER PAGE
// ---------------------------------------------------------------------------

export async function renderCoverCanvas(
  properties: PropertyListing[],
  catalogTitle: string,
  clientName: string,
  brokerProfile: BrokerProfile
): Promise<{ dataUrl: string; links: LinkRect[] }> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;
  const links: LinkRect[] = [];

  const M = 130; // page margin

  // Background — white, minimalist
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // --- Header ---
  drawLopesHeart(ctx, M, 95, 60, LOPES_RED);
  ctx.textBaseline = "alphabetic";
  ctx.font = `900 46px ${FONT}`;
  ctx.fillStyle = SLATE_900;
  ctx.fillText("LOPES", M + 78, 130);
  const lopesW = ctx.measureText("LOPES ").width;
  ctx.fillStyle = LOPES_RED;
  ctx.fillText("MANAUS", M + 78 + lopesW, 130);

  ctx.font = `700 20px ${FONT}`;
  ctx.fillStyle = SLATE_500;
  ctx.fillText("CONSULTORIA IMOBILIÁRIA OFICIAL", M + 78, 158);

  ctx.textAlign = "right";
  ctx.font = `800 20px ${FONT}`;
  ctx.fillStyle = SLATE_500;
  ctx.fillText("PORTFÓLIO EXCLUSIVO", CANVAS_W - M, 108);
  ctx.font = `500 18px ${FONT}`;
  ctx.fillStyle = SLATE_400;
  ctx.fillText(new Date().toLocaleDateString("pt-BR"), CANVAS_W - M, 138);
  ctx.textAlign = "left";

  // --- Title block ---
  let cursorY = 260;
  ctx.font = `800 24px ${FONT}`;
  ctx.fillStyle = LOPES_RED;
  ctx.fillText("APRESENTAÇÃO PERSONALIZADA", M, cursorY);

  cursorY += 60;
  ctx.font = `900 74px ${FONT}`;
  ctx.fillStyle = SLATE_900;
  const titleLines = wrapText(ctx, catalogTitle || "Seleção de Imóveis", CANVAS_W - M * 2);
  for (const line of titleLines.slice(0, 2)) {
    cursorY += 70;
    ctx.fillText(line, M, cursorY);
  }

  cursorY += 55;
  ctx.font = `500 30px ${FONT}`;
  ctx.fillStyle = SLATE_500;
  const countLabel = `${properties.length} ${properties.length === 1 ? "imóvel selecionado" : "imóveis selecionados"} em Manaus/AM`;
  if (clientName) {
    ctx.fillText("Para ", M, cursorY);
    const paraW = ctx.measureText("Para ").width;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillStyle = SLATE_900;
    ctx.fillText(clientName, M + paraW, cursorY);
    const nameW = ctx.measureText(clientName).width;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillStyle = SLATE_500;
    ctx.fillText(`   •   ${countLabel}`, M + paraW + nameW, cursorY);
  } else {
    ctx.fillText(countLabel, M, cursorY);
  }

  // --- Hero image (fills the space that used to be an empty gap) ---
  const heroTop = cursorY + 60;
  const footerH = 300;
  const heroBottom = CANVAS_H - footerH;
  const heroH = heroBottom - heroTop;
  const heroW = CANVAS_W - M * 2;

  if (properties.length > 0) {
    const first = properties[0];
    const img = await loadImageSafely(first.primaryImage);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(M, heroTop, heroW, heroH, 36);
    ctx.clip();
    drawRoundedImage(ctx, img, M, heroTop, heroW, heroH, 0);

    // Bottom scrim for caption legibility (kept dark regardless of page
    // background, since it sits on top of the photo itself)
    const grad = ctx.createLinearGradient(0, heroBottom - heroH * 0.45, 0, heroBottom);
    grad.addColorStop(0, "rgba(2, 6, 23, 0)");
    grad.addColorStop(1, "rgba(2, 6, 23, 0.85)");
    ctx.fillStyle = grad;
    ctx.fillRect(M, heroBottom - heroH * 0.45, heroW, heroH * 0.45);
    ctx.restore();

    // Thin frame around the photo for definition against the white page
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(M, heroTop, heroW, heroH, 36);
    ctx.strokeStyle = SLATE_200;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.font = `800 34px ${FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${first.propertyCategory} • ${first.location.neighborhood}`, M + 44, heroBottom - 60);

    if (properties.length > 1) {
      const extra = properties.length - 1;
      ctx.font = `500 26px ${FONT}`;
      ctx.fillStyle = SLATE_300;
      ctx.fillText(
        `+ ${extra} ${extra === 1 ? "outra opção" : "outras opções"} nesta seleção`,
        M + 44,
        heroBottom - 22
      );
    }
  }

  // --- Footer (broker contact, plain line, no heavy card) ---
  const footerY = CANVAS_H - footerH;
  ctx.strokeStyle = SLATE_200;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, footerY);
  ctx.lineTo(CANVAS_W - M, footerY);
  ctx.stroke();

  const avatarSize = 92;
  const avatarY = footerY + 80;
  const avatarImg = brokerProfile.avatarUrl ? await loadImageSafely(brokerProfile.avatarUrl) : null;
  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(M + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    drawRoundedImage(ctx, avatarImg, M, avatarY, avatarSize, avatarSize, avatarSize / 2);
    ctx.restore();
  } else {
    ctx.fillStyle = LOPES_RED;
    ctx.beginPath();
    ctx.arc(M + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 40px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((brokerProfile.name || "?").charAt(0).toUpperCase(), M + avatarSize / 2, avatarY + avatarSize / 2 + 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  const textX = M + avatarSize + 32;
  ctx.font = `800 32px ${FONT}`;
  ctx.fillStyle = SLATE_900;
  ctx.fillText(brokerProfile.name, textX, avatarY + 38);
  ctx.font = `500 24px ${FONT}`;
  ctx.fillStyle = SLATE_500;
  const creciLine = `${brokerProfile.creci ? `CRECI ${brokerProfile.creci} · ` : ""}${brokerProfile.agencyName || "Lopes Manaus"}`;
  ctx.fillText(creciLine, textX, avatarY + 74);

  ctx.textAlign = "right";
  ctx.font = `600 26px ${FONT}`;
  ctx.fillStyle = SLATE_700;
  ctx.fillText(brokerProfile.phone || "", CANVAS_W - M, avatarY + 38);
  ctx.fillStyle = SLATE_500;
  ctx.fillText(brokerProfile.email || "", CANVAS_W - M, avatarY + 74);
  ctx.textAlign = "left";

  return { dataUrl: canvas.toDataURL("image/jpeg", 0.92), links };
}

// ---------------------------------------------------------------------------
// PROPERTY PAGE (one per selected property)
// ---------------------------------------------------------------------------

export async function renderPropertyCanvas(
  property: PropertyListing,
  brokerProfile: BrokerProfile,
  pageIndex: number,
  totalPages: number,
  catalogTitle: string,
  clientName: string
): Promise<{ dataUrl: string; links: LinkRect[] }> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;
  const links: LinkRect[] = [];
  const isRent = property.modalidade === "Locação";
  const M = 110;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // --- Header ---
  drawLopesHeart(ctx, M, 68, 46, LOPES_RED);
  ctx.font = `900 34px ${FONT}`;
  ctx.fillStyle = SLATE_900;
  ctx.fillText("LOPES", M + 60, 92);
  const lw = ctx.measureText("LOPES ").width;
  ctx.fillStyle = LOPES_RED;
  ctx.fillText("MANAUS", M + 60 + lw, 92);
  ctx.font = `700 16px ${FONT}`;
  ctx.fillStyle = SLATE_500;
  ctx.fillText("CONSULTORIA DE IMÓVEIS • BASE OFICIAL LOPESNET", M + 60, 116);

  ctx.textAlign = "right";
  ctx.font = `800 24px ${FONT}`;
  ctx.fillStyle = SLATE_900;
  ctx.fillText(brokerProfile.name, CANVAS_W - M, 76);
  ctx.font = `500 19px ${FONT}`;
  ctx.fillStyle = SLATE_500;
  ctx.fillText(
    `${brokerProfile.creci ? `CRECI: ${brokerProfile.creci} | ` : ""}${brokerProfile.phone}`,
    CANVAS_W - M,
    102
  );
  ctx.font = `700 18px ${FONT}`;
  ctx.fillStyle = LOPES_RED;
  ctx.fillText(brokerProfile.email || "contato@lopesmanaus.com.br", CANVAS_W - M, 126);
  ctx.textAlign = "left";

  ctx.strokeStyle = LOPES_RED;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(M, 150);
  ctx.lineTo(CANVAS_W - M, 150);
  ctx.stroke();

  let y = 150;

  // --- Catalog context bar ---
  if (catalogTitle) {
    y += 42;
    fillRoundedRect(ctx, M, y - 30, CANVAS_W - M * 2, 56, 14, SLATE_50);
    ctx.font = `700 22px ${FONT}`;
    ctx.fillStyle = SLATE_700;
    ctx.fillText(
      `${catalogTitle}${clientName ? `  •  Preparado para: ${clientName}` : ""}`,
      M + 24,
      y + 6
    );
    ctx.textAlign = "right";
    ctx.font = `600 20px ${FONT}`;
    ctx.fillStyle = SLATE_400;
    ctx.fillText(`Item ${pageIndex + 1} de ${totalPages}`, CANVAS_W - M - 24, y + 6);
    ctx.textAlign = "left";
    y += 40;
  }

  // --- Badge row ---
  y += 56;
  let bx = M;
  const pillH = 44;
  ctx.font = `800 20px ${FONT}`;
  const modalidadeLabel = property.modalidade.toUpperCase();
  const modalidadeW = ctx.measureText(modalidadeLabel).width + 44;
  fillRoundedRect(ctx, bx, y - 30, modalidadeW, pillH, 10, isRent ? BLUE_600 : LOPES_RED);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(modalidadeLabel, bx + 22, y);
  bx += modalidadeW + 14;

  const categoryLabel = property.propertyCategory.toUpperCase();
  const categoryW = ctx.measureText(categoryLabel).width + 44;
  fillRoundedRect(ctx, bx, y - 30, categoryW, pillH, 10, SLATE_900);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(categoryLabel, bx + 22, y);
  bx += categoryW + 20;

  ctx.font = `700 20px ${FONT}`;
  ctx.fillStyle = SLATE_500;
  ctx.fillText(`Cód. ${property.id}`, bx, y);
  bx += ctx.measureText(`Cód. ${property.id}`).width + 20;
  ctx.fillStyle = SLATE_300;
  ctx.fillText("•", bx, y);
  bx += 20;
  ctx.font = `800 20px ${FONT}`;
  ctx.fillStyle = LOPES_RED;
  ctx.fillText(`${property.location.neighborhood} (${property.location.zone})`, bx, y);

  // --- Title ---
  y += 60;
  ctx.font = `900 46px ${FONT}`;
  ctx.fillStyle = SLATE_900;
  const titleLines = wrapText(ctx, property.title, CANVAS_W - M * 2);
  for (const line of titleLines.slice(0, 2)) {
    y += 50;
    ctx.fillText(line, M, y);
  }

  if (property.location.address) {
    y += 36;
    ctx.font = `500 22px ${FONT}`;
    ctx.fillStyle = SLATE_500;
    ctx.fillText(
      `${property.location.address}${property.location.streetNumber ? `, ${property.location.streetNumber}` : ""} - Manaus/AM`,
      M,
      y
    );
  }

  // --- Photo grid ---
  y += 40;
  const gridH = 500;
  const gap = 20;
  const mainW = (CANVAS_W - M * 2) * (2 / 3) - gap / 2;
  const sideW = (CANVAS_W - M * 2) - mainW - gap;
  const mainImg = await loadImageSafely(property.primaryImage);
  drawRoundedImage(ctx, mainImg, M, y, mainW, gridH, 20);

  const sideImgUrls = [
    property.images[1]?.url || property.images[0]?.url || property.primaryImage,
    property.images[2]?.url || property.images[0]?.url || property.primaryImage,
  ];
  const sideImgs = await Promise.all(sideImgUrls.map((u) => loadImageSafely(u)));
  const sideH = (gridH - gap) / 2;
  drawRoundedImage(ctx, sideImgs[0], M + mainW + gap, y, sideW, sideH, 20);
  drawRoundedImage(ctx, sideImgs[1], M + mainW + gap, y + sideH + gap, sideW, sideH, 20);
  y += gridH;

  // --- Price / specs banner ---
  y += 44;
  const bannerH = 190;
  fillRoundedRect(ctx, M, y, CANVAS_W - M * 2, bannerH, 22, SLATE_900);
  const bTextX = M + 44;
  ctx.font = `700 19px ${FONT}`;
  ctx.fillStyle = SLATE_400;
  ctx.fillText(
    (isRent ? "VALOR DE LOCAÇÃO MENSAL" : "VALOR DE INVESTIMENTO"),
    bTextX,
    y + 56
  );
  ctx.font = `900 56px ${FONT}`;
  ctx.fillStyle = "#ffffff";
  const priceStr = formatCurrency(property.price) + (isRent ? " /mês" : "");
  ctx.fillText(priceStr, bTextX, y + 118);
  if (property.condoFee > 0) {
    ctx.font = `500 20px ${FONT}`;
    ctx.fillStyle = SLATE_300;
    ctx.fillText(`Condomínio: ${formatCurrency(property.condoFee)}/mês`, bTextX, y + 152);
  }

  const stats: { label: string; value: string }[] = [
    { label: "ÁREA ÚTIL", value: `${property.livingArea || property.lotArea} m²` },
    { label: "QUARTOS", value: `${property.bedrooms}${property.suites ? ` (${property.suites}s)` : ""}` },
    { label: "BANH.", value: `${property.bathrooms}` },
    { label: "VAGAS", value: `${property.garage}` },
  ];
  const statsAreaW = 900;
  const statW = statsAreaW / stats.length;
  const statsStartX = CANVAS_W - M - 44 - statsAreaW;
  ctx.strokeStyle = SLATE_700;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(statsStartX - 30, y + 40);
  ctx.lineTo(statsStartX - 30, y + bannerH - 40);
  ctx.stroke();
  ctx.textAlign = "center";
  stats.forEach((s, i) => {
    const cx = statsStartX + statW * i + statW / 2;
    ctx.font = `700 18px ${FONT}`;
    ctx.fillStyle = SLATE_400;
    ctx.fillText(s.label, cx, y + 78);
    ctx.font = `900 32px ${FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(s.value, cx, y + 118);
  });
  ctx.textAlign = "left";
  y += bannerH;

  // --- Amenities ---
  const amenities = translateAmenitiesList(property.features).slice(0, 10);
  if (amenities.length > 0) {
    y += 50;
    ctx.font = `800 19px ${FONT}`;
    ctx.fillStyle = SLATE_500;
    ctx.fillText("DESTAQUES & AMENIDADES", M, y);
    y += 20;
    let ax = M;
    let ay = y + 30;
    ctx.font = `600 20px ${FONT}`;
    for (const a of amenities) {
      const label = `✓ ${a}`;
      const w = ctx.measureText(label).width + 36;
      if (ax + w > CANVAS_W - M) {
        ax = M;
        ay += 52;
      }
      fillRoundedRect(ctx, ax, ay - 30, w, 44, 10, SLATE_100, SLATE_200, 1.5);
      ctx.fillStyle = SLATE_700;
      ctx.fillText(label, ax + 18, ay);
      ax += w + 14;
    }
    y = ay + 20;
  }

  // --- Description card (redesigned: bigger, clearer, and stretches to fill
  // the remaining space down to a fixed bottom anchor, so short descriptions
  // no longer leave the page looking squished with empty space below) ---
  const summary = generatePdfSummary(property);
  y += 40;
  ctx.font = `800 20px ${FONT}`;
  ctx.fillStyle = SLATE_800;
  ctx.fillText("📋 APRESENTAÇÃO DO IMÓVEL", M, y);
  y += 26;

  const cardX = M;
  const cardW = CANVAS_W - M * 2;
  const cardPad = 40;
  const textW = cardW - cardPad * 2 - 14; // minus left accent bar

  ctx.font = `800 28px ${FONT}`;
  const headlineLines = wrapText(ctx, summary.headline, textW);
  ctx.font = `500 24px ${FONT}`;
  const descLines = wrapText(ctx, summary.cleanDescription, textW);
  const highlightRows = Math.ceil(summary.highlights.length / 2);

  const naturalCardH =
    cardPad * 2 +
    headlineLines.length * 38 +
    18 +
    descLines.length * 36 +
    (highlightRows > 0 ? 34 + highlightRows * 40 : 0);

  // Reserve fixed space at the bottom of the page for the CTA button and
  // footer. The card grows to help fill that space, but only up to a
  // reasonable cap — stretching a short description into a giant, mostly
  // empty box looks worse than a modestly-sized, well-padded one. When the
  // card is capped short of that anchor, the CTA/footer simply follow right
  // after it instead of being force-pinned far below with a gap in between.
  const footerTextY = CANVAS_H - 90;
  const footerLineY = footerTextY - 30;
  const btnH = 88;
  const ctaY = footerLineY - 40 - btnH;
  const cardBottomMax = ctaY - 36;
  const desiredFillH = cardBottomMax - y;
  const maxStretchH = naturalCardH + 420;
  const cardH = Math.max(naturalCardH, Math.min(desiredFillH, maxStretchH));

  fillRoundedRect(ctx, cardX, y, cardW, cardH, 22, SLATE_50, SLATE_200, 1.5);
  // Rose accent bar on the left edge, like a pull-quote
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, y, cardW, cardH, 22);
  ctx.clip();
  ctx.fillStyle = LOPES_RED;
  ctx.fillRect(cardX, y, 10, cardH);
  ctx.restore();

  // Vertically center the text block within the card so any extra height
  // reads as generous, even padding — not a dead zone at the bottom.
  const contentH = naturalCardH - cardPad * 2;
  const innerH = cardH - cardPad * 2;
  const centerOffset = Math.max(0, (innerH - contentH) / 2);

  let ty = y + cardPad + 8 + centerOffset;
  ctx.font = `800 28px ${FONT}`;
  ctx.fillStyle = SLATE_900;
  for (const line of headlineLines) {
    ty += 38;
    ctx.fillText(line, cardX + cardPad + 14, ty);
  }
  ty += 18;
  ctx.font = `500 24px ${FONT}`;
  ctx.fillStyle = SLATE_700;
  for (const line of descLines) {
    ty += 36;
    ctx.fillText(line, cardX + cardPad + 14, ty);
  }
  if (highlightRows > 0) {
    ty += 30;
    ctx.strokeStyle = SLATE_200;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX + cardPad + 14, ty - 16);
    ctx.lineTo(cardX + cardW - cardPad, ty - 16);
    ctx.stroke();
    const colW = (cardW - cardPad * 2 - 14) / 2;
    summary.highlights.forEach((h, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const hx = cardX + cardPad + 14 + col * colW;
      const hy = ty + row * 40;
      ctx.font = `900 22px ${FONT}`;
      ctx.fillStyle = LOPES_RED;
      ctx.fillText("✓", hx, hy);
      ctx.font = `600 22px ${FONT}`;
      ctx.fillStyle = SLATE_800;
      ctx.fillText(h, hx + 30, hy);
    });
  }
  y += cardH;

  // CTA/footer are pinned to the bottom anchor only if the card actually
  // reached it; otherwise they simply follow the card with a normal gap,
  // leaving a modest (not jarring) blank margin at the bottom — normal for
  // a short one-pager, same as a printed brochure.
  const reachedAnchor = cardH >= desiredFillH - 1;
  let finalCtaY: number;
  let finalFooterLineY: number;
  let finalFooterTextY: number;
  if (reachedAnchor) {
    const overflow = Math.max(0, y + 36 - ctaY);
    finalCtaY = ctaY + overflow;
    finalFooterLineY = footerLineY + overflow;
    finalFooterTextY = footerTextY + overflow;
  } else {
    finalCtaY = y + 36;
    finalFooterLineY = finalCtaY + btnH + 40;
    finalFooterTextY = finalFooterLineY + 30;
  }

  // --- CTA button (pinned near the bottom, with clickable link overlay) ---
  y = finalCtaY;
  fillRoundedRect(ctx, M, y, CANVAS_W - M * 2, btnH, 18, LOPES_RED);
  ctx.font = `800 26px ${FONT}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("👉 Clique Aqui para Ver Mais Fotos e Ficha no Site ↗", CANVAS_W / 2, y + btnH / 2 + 9);
  ctx.textAlign = "left";
  links.push({
    href: `https://manaus.lopes.com.br/imovel/${property.id}`,
    x: M,
    y,
    w: CANVAS_W - M * 2,
    h: btnH,
  });

  // --- Footer (pinned near the bottom) ---
  ctx.strokeStyle = SLATE_200;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, finalFooterLineY);
  ctx.lineTo(CANVAS_W - M, finalFooterLineY);
  ctx.stroke();
  ctx.font = `500 20px ${FONT}`;
  ctx.fillStyle = SLATE_500;
  ctx.fillText(`Atendimento Lopes Manaus • ${brokerProfile.name} • ${brokerProfile.phone}`, M, finalFooterTextY);
  ctx.textAlign = "right";
  ctx.font = `800 20px ${FONT}`;
  ctx.fillStyle = LOPES_RED;
  ctx.fillText(`Ref: ${property.id}`, CANVAS_W - M, finalFooterTextY);
  ctx.textAlign = "left";

  return { dataUrl: canvas.toDataURL("image/jpeg", 0.92), links };
}

// ---------------------------------------------------------------------------
// Orchestration: build the whole PDF
// ---------------------------------------------------------------------------

export async function generateAndDownloadCatalogPDF(
  properties: PropertyListing[],
  catalogTitle: string,
  clientName: string,
  brokerProfile: BrokerProfile,
  fileName: string,
  onProgress?: (p: PDFGenerationProgress) => void
): Promise<void> {
  const totalPages = properties.length + 1; // cover + one page per property

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const pxToMmX = pdfWidth / CANVAS_W;
  const pxToMmY = pdfHeight / CANVAS_H;

  onProgress?.({ currentPage: 1, totalPages, status: "Desenhando a capa..." });
  const cover = await renderCoverCanvas(properties, catalogTitle, clientName, brokerProfile);
  pdf.addImage(cover.dataUrl, "JPEG", 0, 0, pdfWidth, pdfHeight);

  for (let i = 0; i < properties.length; i++) {
    onProgress?.({
      currentPage: i + 2,
      totalPages,
      status: `Desenhando lâmina ${i + 2} de ${totalPages}...`,
    });
    const page = await renderPropertyCanvas(
      properties[i],
      brokerProfile,
      i,
      properties.length,
      catalogTitle,
      clientName
    );
    pdf.addPage("a4", "portrait");
    pdf.addImage(page.dataUrl, "JPEG", 0, 0, pdfWidth, pdfHeight);
    for (const link of page.links) {
      try {
        pdf.link(link.x * pxToMmX, link.y * pxToMmY, link.w * pxToMmX, link.h * pxToMmY, { url: link.href });
      } catch {}
    }
  }

  onProgress?.({ currentPage: totalPages, totalPages, status: "Finalizando arquivo PDF..." });
  const safeFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  pdf.save(safeFileName);
}
