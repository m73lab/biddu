/**
 * Creator kit: 9:16 story asset (1080x1920 PNG) rendered client-side on
 * canvas. No server, no dependencies: photo + title + price + QR + brand.
 *
 * Layout is a fixed vertical stack so text can never overlap the photo:
 *   1. spotlight background + product image contained (never cropped)
 *   2. info block: eyebrow, title (up to 2 lines), price, ends pill
 *   3. QR card, bottom-anchored, with the hashtag underneath
 *
 * Images from other origins taint the canvas (S3 needs CORS); same-origin
 * uploads work. Failures reject so the UI can toast honestly.
 */

export interface StoryAssetInput {
  photoUrl: string | null;
  title: string;
  price: string;
  endsLabel: string | null;
  /** Full https URL encoded in the QR. */
  url: string;
  /** Pre-serialized QR svg element (from the hidden QRCodeSVG). */
  qrSvg: SVGSVGElement | null;
  hashtag?: string;
}

const W = 1080;
const H = 1920;
const INK = "#0b1220";
const GOLD = "#e89b2d";
const CREAM = "#faf6ee";
const MUTED = "#c9c2b4";
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// Photo zone (top). The product is drawn contained inside this box, so a
// tall 9:16 product poster is shown whole instead of overflowing the band.
const PHOTO_BOX = { x: 90, y: 50, w: W - 180, h: 950 };
const PHOTO_BOTTOM = PHOTO_BOX.y + PHOTO_BOX.h; // 1030

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

/** Draw the image scaled to fit entirely inside the box (letterboxed). */
function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Wrap text into as many lines as needed (no truncation). */
function wrapAll(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Pick the largest font size whose wrapped text fits within maxLines. */
function layoutTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): { size: number; lines: string[] } {
  const sizes = [60, 56, 52, 48, 44, 40];
  for (const size of sizes) {
    ctx.font = `700 ${size}px ${FONT}`;
    const lines = wrapAll(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  ctx.font = `700 ${size}px ${FONT}`;
  const lines = wrapAll(ctx, text, maxWidth).slice(0, maxLines);
  if (lines.length === maxLines) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] =
      last.length > 3 ? `${last.slice(0, -3).trimEnd()}…` : last;
  }
  return { size, lines };
}

/** Shrink a single-line string until it fits maxWidth. */
function fitSingle(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  minPx: number,
): number {
  let px = startPx;
  while (px > minPx) {
    ctx.font = `700 ${px}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 4;
  }
  ctx.font = `700 ${px}px ${FONT}`;
  return px;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function generateStoryPng(input: StoryAssetInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  // Base background
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  // Spotlight behind the product so the contained image reads as
  // intentional rather than "floating in the void".
  const spotlight = ctx.createRadialGradient(
    W / 2,
    560,
    80,
    W / 2,
    560,
    760,
  );
  spotlight.addColorStop(0, "#1d2947");
  spotlight.addColorStop(0.55, "#111a2f");
  spotlight.addColorStop(1, INK);
  ctx.fillStyle = spotlight;
  ctx.fillRect(0, 0, W, PHOTO_BOTTOM + 120);

  // Product image (contained + soft shadow, never cropped, never clipped
  // into the text area).
  if (input.photoUrl) {
    try {
      const img = await loadImage(input.photoUrl);
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = 48;
      ctx.shadowOffsetY = 22;
      drawContain(ctx, img, PHOTO_BOX.x, PHOTO_BOX.y, PHOTO_BOX.w, PHOTO_BOX.h);
      ctx.restore();
    } catch {
      // Photo failed: keep the spotlight background.
    }
  }

  // Fade the photo zone into the background
  const fade = ctx.createLinearGradient(0, PHOTO_BOTTOM - 140, 0, PHOTO_BOTTOM + 130);
  fade.addColorStop(0, "rgba(11, 18, 32, 0)");
  fade.addColorStop(1, "rgba(11, 18, 32, 1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, PHOTO_BOTTOM - 140, W, 270);

  ctx.textBaseline = "alphabetic";

  // ---- Info block -------------------------------------------------------
  const LEFT = 90;
  const RIGHT = W - 90;
  const contentW = RIGHT - LEFT;

  let y = 1100;

  // Eyebrow
  ctx.fillStyle = GOLD;
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText("REMATE EN VIVO · BIDDÚ", LEFT, y);
  // Gold underline
  ctx.fillRect(LEFT, y + 18, 120, 5);

  // Title (auto-fit to at most 2 lines)
  y = 1200;
  const title = layoutTitle(ctx, input.title, contentW, 2);
  ctx.fillStyle = CREAM;
  for (const line of title.lines) {
    ctx.fillText(line, LEFT, y);
    y += title.size + 14;
  }

  // Price (auto-fit single line). The gap is derived from the price size so
  // a tall price never crowds the title's descenders.
  const priceSize = fitSingle(ctx, input.price, contentW, 80, 48);
  y += Math.round(priceSize * 0.72) + 18;
  ctx.fillStyle = GOLD;
  ctx.fillText(input.price, LEFT, y);
  y += Math.round(priceSize * 0.25) + 16;

  // Ends pill
  if (input.endsLabel) {
    ctx.font = `700 38px ${FONT}`;
    const tw = ctx.measureText(input.endsLabel).width;
    const pw = tw + 76;
    const ph = 76;
    ctx.fillStyle = GOLD;
    roundRect(ctx, LEFT, y, pw, ph, 38);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.fillText(input.endsLabel, LEFT + 38, y + 52);
    y += ph + 30;
  } else {
    y += 12;
  }

  // ---- QR card (bottom-anchored) ---------------------------------------
  const hashtagY = H - 56;
  const qrSize = 160;
  const cardPad = 20;
  const cardH = qrSize + cardPad * 2;
  const cardW = 700;
  const cardX = (W - cardW) / 2;
  const cardY = Math.min(y + 16, hashtagY - 56 - cardH);
  const qrX = cardX + cardPad;
  const textX = qrX + qrSize + 34;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.restore();

  if (input.qrSvg) {
    try {
      const svgText = new XMLSerializer().serializeToString(input.qrSvg);
      const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
      const svgUrl = URL.createObjectURL(svgBlob);
      try {
        const qrImg = await loadImage(svgUrl);
        ctx.drawImage(qrImg, qrX, cardY + cardPad, qrSize, qrSize);
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    } catch {
      // QR failed: card stays as a branded placeholder
    }
  }

  // QR side text (vertically centered against the QR square)
  const midY = cardY + cardPad + qrSize / 2;
  ctx.fillStyle = INK;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText("Escanea", textX, midY - 22);
  ctx.fillText("y puja", textX, midY + 26);
  ctx.font = `400 30px ${FONT}`;
  ctx.fillStyle = "#3a4356";
  const host = (() => {
    try {
      return new URL(input.url).host;
    } catch {
      return "biddu.online";
    }
  })();
  ctx.fillText(host, textX, midY + 72);

  // Footer hashtag
  ctx.fillStyle = MUTED;
  ctx.font = `700 36px ${FONT}`;
  const tag = input.hashtag || "#RemataEnBiddú";
  const tagW = ctx.measureText(tag).width;
  ctx.fillText(tag, (W - tagW) / 2, hashtagY);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("encode");
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
