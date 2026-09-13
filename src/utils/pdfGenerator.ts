import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PDFGenerationProgress {
  currentPage: number;
  totalPages: number;
  status: string;
}

// 1x1 transparent placeholder data URL to prevent html2canvas from hanging on broken images
const FALLBACK_IMAGE_DATA_URL =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'%3E%3Crect width='800' height='500' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2394a3b8'%3EImóvel Lopes Manaus%3C/text%3E%3C/svg%3E";

/**
 * Converts any CSS color string (including oklch, oklab, display-p3) to standard RGB/RGBA/Hex
 * using the browser's 2D canvas context. This completely prevents html2canvas from crashing with:
 * "Attempting to parse an unsupported color function 'oklch'".
 */
let colorCanvasCtx: CanvasRenderingContext2D | null = null;

function convertOklchToRgb(colorStr: string): string {
  if (!colorStr || typeof colorStr !== "string") return colorStr;
  if (!colorStr.includes("oklch") && !colorStr.includes("oklab")) {
    return colorStr;
  }

  try {
    if (!colorCanvasCtx && typeof document !== "undefined") {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      colorCanvasCtx = c.getContext("2d", { willReadFrequently: true });
    }

    if (colorCanvasCtx) {
      colorCanvasCtx.fillStyle = "#ffffff";
      colorCanvasCtx.fillStyle = colorStr;
      const res = colorCanvasCtx.fillStyle;
      if (res && !res.includes("oklch") && !res.includes("oklab")) {
        return res;
      }
    }
  } catch {}

  // Fallback if browser canvas is not available or fails
  return "rgb(225, 29, 72)";
}

function sanitizeOklchText(text: string): string {
  if (!text || (!text.includes("oklch") && !text.includes("oklab"))) {
    return text;
  }
  return text.replace(/oklch\s*\([^)]+\)/gi, (match) => {
    return convertOklchToRgb(match);
  });
}

function sanitizeElementStyles(root: HTMLElement) {
  if (!root) return;
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of elements) {
    const styleAttr = el.getAttribute("style");
    if (styleAttr && (styleAttr.includes("oklch") || styleAttr.includes("oklab"))) {
      el.setAttribute("style", sanitizeOklchText(styleAttr));
    }

    try {
      const comp = window.getComputedStyle(el);
      const props = [
        "color",
        "backgroundColor",
        "borderColor",
        "outlineColor",
        "boxShadow",
        "fill",
        "stroke",
      ] as const;

      for (const p of props) {
        const val = comp[p];
        if (val && typeof val === "string" && (val.includes("oklch") || val.includes("oklab"))) {
          (el.style as any)[p] = convertOklchToRgb(val);
        }
      }
    } catch {}
  }
}

/**
 * Converts an image source to a Base64 data URL with strict timeout.
 * If fetch or conversion fails, returns the fallback SVG placeholder immediately.
 */
async function toDataURL(src: string): Promise<string> {
  if (!src) return FALLBACK_IMAGE_DATA_URL;
  if (src.startsWith("data:image/")) return src;

  const isRelative = src.startsWith("/");
  const targetUrl = isRelative
    ? window.location.origin + src
    : `/api/image-proxy?url=${encodeURIComponent(src)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return FALLBACK_IMAGE_DATA_URL;
    const blob = await res.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve((reader.result as string) || FALLBACK_IMAGE_DATA_URL);
      };
      reader.onerror = () => {
        resolve(FALLBACK_IMAGE_DATA_URL);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return FALLBACK_IMAGE_DATA_URL;
  }
}

/**
 * Clones a DOM element off-screen and converts all nested <img> elements to Base64 data URLs
 * so that html2canvas can capture them with 100% fidelity without network stalls.
 */
async function prepareElementForCapture(element: HTMLElement): Promise<{ clone: HTMLElement; cleanup: () => void }> {
  const clone = element.cloneNode(true) as HTMLElement;

  // Standard A4 dimensions in pixels at 96 DPI
  clone.style.width = "794px";
  clone.style.minHeight = "1123px";
  clone.style.maxWidth = "794px";
  clone.style.backgroundColor = "#ffffff";
  clone.style.boxSizing = "border-box";
  clone.style.margin = "0";

  // Pre-sanitize inline styles
  sanitizeElementStyles(clone);

  // Create clean sandbox container on DOM
  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.left = "0";
  sandbox.style.top = "0";
  sandbox.style.width = "800px";
  sandbox.style.height = "1150px";
  sandbox.style.overflow = "hidden";
  sandbox.style.zIndex = "-9999";
  sandbox.style.opacity = "0.01";
  sandbox.style.pointerEvents = "none";
  sandbox.style.backgroundColor = "#ffffff";

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  // Convert all images inside the clone to Base64 Data URLs in parallel
  const imgElements = Array.from(clone.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    imgElements.map(async (img) => {
      const currentSrc = img.getAttribute("src") || img.src;
      if (currentSrc) {
        const base64Src = await toDataURL(currentSrc);
        img.src = base64Src;
        try {
          if ("decode" in img) {
            await img.decode().catch(() => {});
          }
        } catch {}
      }
    })
  );

  const cleanup = () => {
    if (sandbox.parentElement) {
      document.body.removeChild(sandbox);
    }
  };

  return { clone, cleanup };
}

/**
 * Downloads a multi-page PDF generated from DOM elements (e.g. .catalog-a4-page).
 */
export async function generateAndDownloadPDF(
  pageElements: HTMLElement[],
  fileName: string,
  onProgress?: (p: PDFGenerationProgress) => void
): Promise<void> {
  if (!pageElements || pageElements.length === 0) {
    throw new Error("Nenhuma lâmina para gerar PDF.");
  }

  // Ensure fonts are ready
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {}
  }

  const totalPages = pageElements.length;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  for (let i = 0; i < totalPages; i++) {
    const el = pageElements[i];

    if (onProgress) {
      onProgress({
        currentPage: i + 1,
        totalPages,
        status: `Otimizando imagens da página ${i + 1} de ${totalPages}...`,
      });
    }

    const { clone, cleanup } = await prepareElementForCapture(el);

    try {
      if (onProgress) {
        onProgress({
          currentPage: i + 1,
          totalPages,
          status: `Renderizando lâmina ${i + 1} de ${totalPages}...`,
        });
      }

      // Fast capture with html2canvas (scale 1.5 delivers sharp A4 prints without heavy memory lag)
      const canvas = await html2canvas(clone, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        imageTimeout: 3000,
        onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
          // 1. Sanitize all <style> tags in cloned document <head> and <body>
          const styleElements = Array.from(clonedDoc.querySelectorAll("style"));
          for (const styleEl of styleElements) {
            if (
              styleEl.textContent &&
              (styleEl.textContent.includes("oklch") || styleEl.textContent.includes("oklab"))
            ) {
              styleEl.textContent = sanitizeOklchText(styleEl.textContent);
            }
          }

          // 2. Sanitize element inline & computed styles in cloned element
          if (clonedElement) {
            sanitizeElementStyles(clonedElement as HTMLElement);
          }
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.9);

      // Extract links from clone to embed real clickable PDF link annotations
      const pdfLinks: { href: string; x: number; y: number; w: number; h: number }[] = [];
      const cloneRect = clone.getBoundingClientRect();
      if (cloneRect.width > 0 && cloneRect.height > 0) {
        const aNodes = Array.from(clone.querySelectorAll<HTMLAnchorElement>("a[href]"));
        for (const aNode of aNodes) {
          const href = aNode.getAttribute("href") || aNode.href;
          if (!href || href === "#") continue;
          const rect = aNode.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const relX = rect.left - cloneRect.left;
            const relY = rect.top - cloneRect.top;
            pdfLinks.push({
              href,
              x: (relX / cloneRect.width) * pdfWidth,
              y: (relY / cloneRect.height) * pdfHeight,
              w: (rect.width / cloneRect.width) * pdfWidth,
              h: (rect.height / cloneRect.height) * pdfHeight,
            });
          }
        }
      }

      if (i > 0) {
        pdf.addPage("a4", "portrait");
      }

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      // Add clickable PDF link annotations over the rendered page
      for (const link of pdfLinks) {
        try {
          pdf.link(link.x, link.y, link.w, link.h, { url: link.href });
        } catch (e) {
          console.warn("Failed to add PDF link annotation:", e);
        }
      }
    } finally {
      cleanup();
    }
  }

  if (onProgress) {
    onProgress({
      currentPage: totalPages,
      totalPages,
      status: "Finalizando arquivo PDF para download...",
    });
  }

  const safeFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;

  // Trigger download
  pdf.save(safeFileName);

  // Fallback programmatic Blob download
  try {
    const blob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = safeFileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (err) {
    console.warn("[PDFGenerator] Fallback blob download:", err);
  }
}

/**
 * Opens a clean, perfectly styled printable window with full Tailwind CSS styles and @page A4 formatting.
 * Guaranteed 100% native quality and zero waiting time.
 */
export function printElementInNewWindow(element: HTMLElement, title: string) {
  const headStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((node) => node.outerHTML)
    .join("\n");

  const printWindow = window.open("", "_blank", "width=1000,height=900");

  if (!printWindow) {
    window.print();
    return;
  }

  const clone = element.cloneNode(true) as HTMLElement;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        ${headStyles}
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 6mm 6mm 6mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .catalog-a4-page {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            margin-bottom: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 20px !important;
          }
          .catalog-a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .no-print {
            display: none !important;
          }
          img {
            max-width: 100%;
            height: auto;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        <div id="print-root" style="max-width: 800px; margin: 0 auto;"></div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 400);
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
  const dest = printWindow.document.getElementById("print-root");
  if (dest) {
    dest.appendChild(clone);
  }
}
