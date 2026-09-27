"use client";

// On-device computer vision: compression, blur (Laplacian variance) and exposure checks.
// Runs before any upload so citizens get instant feedback, even offline.

export type Quality = {
  blurScore: number;
  brightness: number;
  width: number;
  height: number;
  ok: boolean;
  issues: string[];
};

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Resize so the long side is 1648px (Nemotron-Parse's sweet spot) and re-encode as JPEG. */
export function compress(img: HTMLImageElement, longSide = 1648, q = 0.85) {
  // Scale up as well as down: OCR of Devanagari vowel signs improves markedly at ~1648px
  const s = longSide / Math.max(img.naturalWidth, img.naturalHeight);
  const w = Math.round(img.naturalWidth * s);
  const h = Math.round(img.naturalHeight * s);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return { dataUrl: c.toDataURL("image/jpeg", q), width: w, height: h };
}

export function assessQuality(img: HTMLImageElement): Quality {
  const W = 800;
  const H = Math.round((img.naturalHeight * W) / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);
  const g = new Float32Array(W * H);
  let sum = 0;
  for (let i = 0; i < W * H; i++) {
    const v = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    g[i] = v;
    sum += v;
  }
  const brightness = sum / (W * H);
  // Variance of the Laplacian: low variance = few sharp edges = blurry
  let n = 0, mean = 0, m2 = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const lap = g[i - 1] + g[i + 1] + g[i - W] + g[i + W] - 4 * g[i];
      n++;
      const d = lap - mean;
      mean += d / n;
      m2 += d * (lap - mean);
    }
  }
  const blurScore = Math.round(m2 / n);
  const issues: string[] = [];
  if (blurScore < 120) issues.push("blurry");
  if (brightness < 70) issues.push("too_dark");
  if (brightness > 245) issues.push("overexposed");
  if (Math.min(img.naturalWidth, img.naturalHeight) < 400) issues.push("low_resolution");
  return { blurScore, brightness: Math.round(brightness), width: img.naturalWidth, height: img.naturalHeight, ok: issues.length === 0, issues };
}

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const ISSUE_TEXT: Record<string, { en: string; hi: string }> = {
  blurry: { en: "Photo is blurry — hold the phone steady and retake", hi: "फोटो धुंधली है — फोन स्थिर रखकर दोबारा लें" },
  too_dark: { en: "Photo is too dark — move to better light", hi: "फोटो बहुत अंधेरी है — रोशनी में लें" },
  overexposed: { en: "Too much glare — avoid direct light on the document", hi: "बहुत चमक है — दस्तावेज़ पर सीधी रोशनी न पड़ने दें" },
  low_resolution: { en: "Image resolution is too low", hi: "फोटो की गुणवत्ता बहुत कम है" },
};

/** Offline OCR fallback (Hindi + English) using Tesseract.js in the browser. */
export async function tesseractOcr(dataUrl: string, onProgress?: (p: number) => void) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["hin", "eng"], 1, {
    logger: (m: { status: string; progress: number }) => m.status === "recognizing text" && onProgress?.(m.progress),
  });
  const { data } = await worker.recognize(dataUrl);
  await worker.terminate();
  return data.text;
}
