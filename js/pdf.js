// pdf.js 래퍼: 라이브러리는 vendor/에 내장되어 있고 외부 통신은 하지 않는다.
import * as pdfjs from "../vendor/pdfjs/pdf.min.mjs";
import { MAX_CANVAS_PIXELS } from "./limits.js";

const base = new URL("../vendor/pdfjs/", import.meta.url).href;
pdfjs.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";

const common = {
  cMapUrl: base + "cmaps/", cMapPacked: true,
  standardFontDataUrl: base + "standard_fonts/", wasmUrl: base + "wasm/", iccUrl: base + "iccs/",
  enableXfa: false, isEvalSupported: false,
  disableFontFace: true,          // 글꼴을 data:/blob:로 불러오지 않고 도형으로 그린다 (CSP 유지)
  useSystemFonts: false, verbosity: 0,
};

// File에서 pdf.js가 요청한 구간만 읽어 준다. 수 GB 파일도 통째로 메모리에 올리지 않는다.
class FileRange extends pdfjs.PDFDataRangeTransport {
  constructor(file, initial) { super(file.size, initial); this.file = file; this.dead = false; }
  requestDataRange(begin, end) {
    this.file.slice(begin, Math.min(end, this.file.size)).arrayBuffer()
      .then(buf => { if (!this.dead) this.onDataRange(begin, new Uint8Array(buf)); }).catch(() => {});
  }
  abort() { this.dead = true; }
}
export async function openPdfFile(file) {
  const first = new Uint8Array(await file.slice(0, Math.min(file.size, 1 << 16)).arrayBuffer());
  const range = new FileRange(file, first);
  const task = pdfjs.getDocument({ range, rangeChunkSize: 1 << 20, disableAutoFetch: true, disableStream: true, ...common });
  return task.promise;
}
// PDF 글자 정보(텍스트 레이어)를 줄 단위로 읽기. 글자가 없으면 chars=0
// 조각 사이에 공백을 넣을지는 실제 간격(x 위치)으로 판단한다. ("있었다" + "." 이 "있었다 ." 가 되지 않도록)
export async function readTextLines(page) {
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items = [];
  for (const it of tc.items) {
    if (typeof it.str !== "string") continue;
    const h = Math.abs(it.transform[3]) || it.height || 10;
    items.push({ s: it.str, x: it.transform[4], w: it.width || 0, y: vp.height - it.transform[5], h });
  }
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of items) {
    if (!it.s.trim()) { const ln = lines[lines.length - 1]; if (ln && Math.abs(it.y - ln.y) < Math.max(2, ln.h * 0.5)) ln.parts.push(it); continue; }
    const ln = lines[lines.length - 1];
    if (ln && Math.abs(it.y - ln.y) < Math.max(2, ln.h * 0.5)) { ln.parts.push(it); ln.h = Math.max(ln.h, it.h); }
    else lines.push({ y: it.y, h: it.h, parts: [it] });
  }
  const out = [];
  for (const l of lines) {
    l.parts.sort((a, b) => a.x - b.x);
    let t = "", prev = null;
    for (const p of l.parts) {
      if (prev) {
        const gap = p.x - (prev.x + prev.w);
        if (gap > l.h * 0.15 || /\s$/.test(prev.s) || /^\s/.test(p.s)) t += " ";
      }
      t += p.s; prev = p;
    }
    t = t.replace(/\s+/g, " ").trim();
    if (t) out.push({ t, y: l.y - l.h, h: l.h });
  }
  return { lines: out, chars: out.reduce((s, l) => s + l.t.length, 0), H: vp.height };
}

// 쪽을 canvas로 그리기. maxW/maxH(상자에 맞춤) 또는 longSide(긴 변 픽셀) 중 하나를 지정
export async function renderToCanvas(page, { maxW, maxH, longSide, gray = false } = {}) {
  const v1 = page.getViewport({ scale: 1 });
  let scale = maxW ? Math.min(maxW / v1.width, maxH / v1.height) : longSide / Math.max(v1.width, v1.height);
  const px = v1.width * v1.height * scale * scale;
  if (px > MAX_CANVAS_PIXELS) scale *= Math.sqrt(MAX_CANVAS_PIXELS / px);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(vp.width)); canvas.height = Math.max(1, Math.floor(vp.height));
  const ctx = canvas.getContext("2d", { willReadFrequently: gray });
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  if (gray) grayCanvas(canvas);
  return canvas;
}
export function grayCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0; d[i] = d[i + 1] = d[i + 2] = g; }
  ctx.putImageData(img, 0, 0);
}
// 캔버스를 deg도(시계 방향이 +) 회전한 새 캔버스. 빈 모서리는 원본 테두리의 평균색으로 채운다. (OCR 재시도용, 작은 각도 전용)
export function rotateCanvas(src, deg) {
  const r = deg * Math.PI / 180, cs = Math.abs(Math.cos(r)), sn = Math.abs(Math.sin(r));
  const w = src.width, h = src.height;
  const out = document.createElement("canvas");
  out.width = Math.ceil(w * cs + h * sn); out.height = Math.ceil(w * sn + h * cs);
  const sc = src.getContext("2d", { willReadFrequently: true });
  const px = [sc.getImageData(0, 0, 8, 8).data, sc.getImageData(w - 8, 0, 8, 8).data, sc.getImageData(0, h - 8, 8, 8).data, sc.getImageData(w - 8, h - 8, 8, 8).data];
  let R = 0, G = 0, B = 0, N = 0;
  for (const d of px) for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; N++; }
  const ctx = out.getContext("2d");
  ctx.fillStyle = `rgb(${R / N | 0},${G / N | 0},${B / N | 0})`; ctx.fillRect(0, 0, out.width, out.height);
  ctx.translate(out.width / 2, out.height / 2); ctx.rotate(r); ctx.drawImage(src, -w / 2, -h / 2);
  return out;
}
export async function canvasToJpeg(canvas, q = 0.82) {
  const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", q));
  if (!blob) throw new Error("JPEG");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w: canvas.width, h: canvas.height };
}
export const freeCanvas = c => { c.width = 0; c.height = 0; };
