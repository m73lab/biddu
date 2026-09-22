/**
 * Creator kit: 9:16 story asset (1080x1920 PNG) rendered client-side on
 * canvas. No server, no dependencies: photo + price + QR + brand.
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = next;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && words.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] =
      last.length > 3 ? `${last.slice(0, -3).trimEnd()}…` : last;
  }
  return lines;
}

export async function generateStoryPng(input: StoryAssetInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  // Background
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  // Photo band (fixed compact layout; everything below is measured
  // to always fit inside 1920px even with a 2-line title + pill).
  const photoH = 860;
  try {
    if (input.photoUrl) {
      const img = await loadImage(input.photoUrl);
      ctx.save();
      ctx.fillStyle = "#141d33";
      ctx.fillRect(0, 0, W, photoH);
      drawCover(ctx, img, 0, 0, W, photoH);
      ctx.restore();
    }
  } catch {
    // No photo: gradient wash fallback
    const g = ctx.createLinearGradient(0, 0, W, photoH);
    g.addColorStop(0, "#1c2844");
    g.addColorStop(1, "#0b1220");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, photoH);
  }
  // Fade photo into background
  const fade = ctx.createLinearGradient(0, photoH - 180, 0, photoH + 30);
  fade.addColorStop(0, "rgba(11,18,32,0)");
  fade.addColorStop(1, "rgba(11,18,32,1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, photoH - 180, W, 210);

  let y = photoH + 60;
  ctx.textBaseline = "alphabetic";

  // Eyebrow
  ctx.fillStyle = GOLD;
  ctx.font = "700 36px system-ui, sans-serif";
  ctx.fillText("REMATE EN VIVO · BIDDÚ", 80, y);
  y += 100;

  // Title (up to 2 lines)
  ctx.fillStyle = CREAM;
  ctx.font = "700 72px system-ui, sans-serif";
  const titleLines = wrapLines(ctx, input.title, W - 160, 2);
  for (const line of titleLines) {
    ctx.fillText(line, 80, y);
    y += 90;
  }
  y += 24;

  // Price
  ctx.fillStyle = GOLD;
  ctx.font = "700 92px system-ui, sans-serif";
  ctx.fillText(input.price, 80, y);
  y += 44;

  // Ends pill
  if (input.endsLabel) {
    ctx.font = "700 40px system-ui, sans-serif";
    const label = input.endsLabel;
    const tw = ctx.measureText(label).width;
    const pw = tw + 80;
    const ph = 84;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.roundRect(80, y, pw, ph, 42);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.fillText(label, 80 + 40, y + 57);
    y += ph + 44;
  } else {
    y += 24;
  }

  // QR card (centered)
  const qrSize = 230;
  const cardPad = 24;
  const cardW = 760;
  const cardX = (W - cardW) / 2;
  const cardY = y;
  const cardH = qrSize + cardPad * 2;
  const qrX = cardX + cardPad;
  const textX = qrX + qrSize + 36;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 28);
  ctx.fill();
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
  // QR side text
  ctx.fillStyle = INK;
  ctx.font = "700 38px system-ui, sans-serif";
  ctx.fillText("Escanea", textX, cardY + 110);
  ctx.fillText("y puja", textX, cardY + 160);
  ctx.font = "400 32px system-ui, sans-serif";
  ctx.fillStyle = "#3a4356";
  const host = (() => {
    try {
      return new URL(input.url).host;
    } catch {
      return "biddu.online";
    }
  })();
  ctx.fillText(host, textX, cardY + 212);

  // Footer hashtag
  ctx.fillStyle = MUTED;
  ctx.font = "700 38px system-ui, sans-serif";
  const tag = input.hashtag || "#RemataEnBiddú";
  const tagW = ctx.measureText(tag).width;
  ctx.fillText(tag, (W - tagW) / 2, H - 70);

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
