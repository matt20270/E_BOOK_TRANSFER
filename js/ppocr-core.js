// PP-OCR(PaddleOCR) 처리의 순수 함수 모음. DOM·ONNX 없이 동작하므로 Node에서도 시험할 수 있다.
// 이 알고리즘은 Python으로 먼저 검증했다: 검출 확률 지도 -> 글줄 덩어리 -> 중심선을 따라 펴기 -> 인식 -> CTC 해석.
export const DET = { thresh: 0.5, k: 1.0, minArea: 150, minW: 40, minH: 8 };
export const BAND = { ratio: 1.9, offset: 0.1, xpad: 0.35 };   // 시험으로 정한 값: 두께 1.6~2.5배, 아래로 0.05~0.25 범위에서 거의 평평
export const REC_H = 48, REC_BASE_W = 320;
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];

// ---------- 이미지 도우미 ----------
export function resizeRGBA(src, sw, sh, dw, dh) {
  if (sw === dw && sh === dh) return src;
  const out = new Uint8ClampedArray(dw * dh * 4), fx = sw / dw, fy = sh / dh;
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.max(0, (y + 0.5) * fy - 0.5)), y0 = sy | 0, y1 = Math.min(sh - 1, y0 + 1), wy = sy - y0;
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.max(0, (x + 0.5) * fx - 0.5)), x0 = sx | 0, x1 = Math.min(sw - 1, x0 + 1), wx = sx - x0;
      const a = (y0 * sw + x0) * 4, b = (y0 * sw + x1) * 4, c = (y1 * sw + x0) * 4, d = (y1 * sw + x1) * 4, o = (y * dw + x) * 4;
      for (let ch = 0; ch < 4; ch++) out[o + ch] = src[a + ch] * (1 - wx) * (1 - wy) + src[b + ch] * wx * (1 - wy) + src[c + ch] * (1 - wx) * wy + src[d + ch] * wx * wy;
    }
  }
  return out;
}
const to32 = v => Math.max(32, Math.round(v / 32) * 32);

// 검출 모델 입력: 가로·세로를 32의 배수로 맞춘 RGB, ImageNet 정규화, CHW
export function detInput(rgba, w, h, k = DET.k) {
  const W = to32(w * k), H = to32(h * k), img = resizeRGBA(rgba, w, h, W, H), n = W * H, data = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) data[c * n + i] = (img[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  return { data, W, H, img };
}

// ---------- 글줄 덩어리 찾기 (8방향 연결 요소) ----------
export function labelComponents(prob, W, H, th = DET.thresh) {
  const labels = new Int32Array(W * H), stack = new Int32Array(W * H), comps = [];
  let next = 1;
  for (let i = 0; i < W * H; i++) {
    if (prob[i] > th && labels[i] === 0) {
      let sp = 0, x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0; stack[sp++] = i; labels[i] = next;
      while (sp) {
        const p = stack[--sp], px = p % W, py = (p - px) / W; area++;
        if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        for (let dy = -1; dy <= 1; dy++) { const ny = py + dy; if (ny < 0 || ny >= H) continue;
          for (let dx = -1; dx <= 1; dx++) { const nx = px + dx; if (nx < 0 || nx >= W) continue;
            const q = ny * W + nx; if (prob[q] > th && labels[q] === 0) { labels[q] = next; stack[sp++] = q; } } }
      }
      comps.push({ id: next, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, area }); next++;
    }
  }
  return { labels, comps };
}
export const keepComp = (c, k = DET.k) => c.area >= DET.minArea * k * k && c.w >= DET.minW * k && c.h >= DET.minH * k;

// ---------- 휘어진 글줄을 중심선을 따라 펴기 ----------
const median = a => { const s = Float64Array.from(a).sort(); return s.length ? s[s.length >> 1] : 0; };
function medianFilter(a, size) { const r = size >> 1, n = a.length, o = new Float64Array(n), win = [];
  for (let i = 0; i < n; i++) { win.length = 0; for (let j = i - r; j <= i + r; j++) win.push(a[Math.min(n - 1, Math.max(0, j))]); win.sort((x, y) => x - y); o[i] = win[win.length >> 1]; } return o; }
function gaussian(a, sigma) {
  const r = Math.ceil(sigma * 4), ker = [], n = a.length; let s = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-0.5 * (i / sigma) ** 2); ker.push(v); s += v; }
  const refl = i => { if (n === 1) return 0; const p = 2 * n; i = ((i % p) + p) % p; return i < n ? i : p - 1 - i; };
  const o = new Float64Array(n);
  for (let i = 0; i < n; i++) { let v = 0; for (let j = -r; j <= r; j++) v += ker[j + r] * a[refl(i + j)]; o[i] = v / s; }
  return o;
}
function bilinear(img, w, h, x, y, ch) {
  x = Math.min(w - 1, Math.max(0, x)); y = Math.min(h - 1, Math.max(0, y));
  const x0 = x | 0, y0 = y | 0, x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), wx = x - x0, wy = y - y0;
  return img[(y0 * w + x0) * 4 + ch] * (1 - wx) * (1 - wy) + img[(y0 * w + x1) * 4 + ch] * wx * (1 - wy) + img[(y1 * w + x0) * 4 + ch] * (1 - wx) * wy + img[(y1 * w + x1) * 4 + ch] * wx * wy;
}
// 반환: { data: BGR Uint8 (h x w x 3), w, h, cy: 줄 중심 y, thick: 줄 두께, x0, x1 } 또는 null
export function straightenLine(img, iw, ih, labels, comp, p = BAND) {
  const { x0, y0, w, h, id } = comp, top = new Float64Array(w).fill(NaN), bot = new Float64Array(w).fill(NaN);
  for (let u = 0; u < w; u++) for (let v = 0; v < h; v++) if (labels[(y0 + v) * iw + x0 + u] === id) { if (isNaN(top[u])) top[u] = v; bot[u] = v; }
  const ok = []; for (let u = 0; u < w; u++) if (!isNaN(top[u])) ok.push(u);
  if (ok.length < 10) return null;
  const fill = a => { for (let u = 0, j = 0; u < w; u++) { if (!isNaN(a[u])) continue; while (j < ok.length - 1 && ok[j + 1] < u) j++;
    const l = ok[j] <= u ? ok[j] : null, r = ok[Math.min(j + 1, ok.length - 1)] >= u ? ok[Math.min(j + 1, ok.length - 1)] : null;
    a[u] = l !== null && r !== null && r !== l ? a[l] + (a[r] - a[l]) * (u - l) / (r - l) : (l !== null ? a[l] : a[r]); } };
  fill(top); fill(bot);
  const mid = new Float64Array(w), th = new Float64Array(w); for (let u = 0; u < w; u++) { mid[u] = (top[u] + bot[u]) / 2; th[u] = bot[u] - top[u]; }
  let c = Array.from(gaussian(medianFilter(mid, 15), 6), v => v + y0);
  const thick = median(th) + 1, band = Math.max(16, Math.round(thick * p.ratio)), pad = Math.round(p.xpad * thick);
  if (pad > 0) { const a = c.slice(0, 10).reduce((s, v) => s + v, 0) / Math.min(10, c.length), b = c.slice(-10).reduce((s, v) => s + v, 0) / Math.min(10, c.length);
    c = [...new Array(pad).fill(a), ...c, ...new Array(pad).fill(b)]; }
  const W = w + 2 * pad, X0 = x0 - pad, data = new Uint8Array(band * W * 3);
  for (let v = 0; v < band; v++) for (let u = 0; u < W; u++) {
    const sx = X0 + u, sy = c[u] + p.offset * thick + (v - (band - 1) / 2), o = (v * W + u) * 3;
    data[o] = bilinear(img, iw, ih, sx, sy, 2); data[o + 1] = bilinear(img, iw, ih, sx, sy, 1); data[o + 2] = bilinear(img, iw, ih, sx, sy, 0);   // BGR
  }
  return { data, w: W, h: band, cy: c[(c.length / 2) | 0], thick, x0: X0, x1: X0 + W };
}

// ---------- 인식 입력(배치)과 CTC 해석 ----------
// crops: [{data BGR Uint8, w, h}] -> { data Float32 [n,3,48,W], n, h, w }
export function prepareRec(crops, imgH = REC_H) {
  const maxRatio = Math.max(REC_BASE_W / imgH, ...crops.map(c => c.w / c.h)), imgW = Math.floor(imgH * maxRatio), n = crops.length;
  const data = new Float32Array(n * 3 * imgH * imgW);                      // 0으로 채워 오른쪽 여백 (PaddleOCR과 같음)
  crops.forEach((c, i) => {
    const ratio = c.w / c.h, rw = Math.min(imgW, Math.ceil(imgH * ratio)), base = i * 3 * imgH * imgW;
    const rgba = new Uint8ClampedArray(c.w * c.h * 4); for (let p = 0; p < c.w * c.h; p++) { rgba[p * 4] = c.data[p * 3]; rgba[p * 4 + 1] = c.data[p * 3 + 1]; rgba[p * 4 + 2] = c.data[p * 3 + 2]; rgba[p * 4 + 3] = 255; }
    const r = resizeRGBA(rgba, c.w, c.h, rw, imgH);
    for (let y = 0; y < imgH; y++) for (let x = 0; x < rw; x++) for (let ch = 0; ch < 3; ch++)
      data[base + ch * imgH * imgW + y * imgW + x] = (r[(y * rw + x) * 4 + ch] / 255 - 0.5) / 0.5;
  });
  return { data, n, h: imgH, w: imgW };
}
export function parseDict(text) { const lines = String(text).replace(/\r/g, "").split("\n"); if (lines.length && lines[lines.length - 1] === "") lines.pop(); return ["", ...lines, " "]; }  // 0=빈칸 기호, 마지막=공백
// out: Float32Array [n,T,C]. 각 줄: { text, conf(0~1), probs:[글자별 확률] }
export function ctcDecode(out, n, T, C, chars) {
  const res = [];
  for (let b = 0; b < n; b++) {
    let last = 0, text = "", probs = [];
    for (let t = 0; t < T; t++) {
      const o = (b * T + t) * C; let best = 0, bp = -1; for (let c = 0; c < C; c++) if (out[o + c] > bp) { bp = out[o + c]; best = c; }
      if (best !== 0 && best !== last) { text += chars[best] ?? ""; probs.push(bp); }
      last = best;
    }
    res.push({ text, probs, conf: probs.length ? probs.reduce((s, v) => s + v, 0) / probs.length : 0 });
  }
  return res;
}
// PP-OCR 한국어 모델은 구두점 뒤 공백을 자주 빠뜨린다 -> 규칙으로 보정 (한글 앞의 . , ? ! 와 글자 앞의 , ? !)
export function fixPunctSpacing(s) { return s.replace(/([.,?!])(?=[가-힣])/g, "$1 ").replace(/([,?!])(?=[A-Za-z])/g, "$1 "); }

// 줄 목록 -> ocrPage()가 받는 blocks 모양. 글자는 줄 텍스트, 신뢰도는 토큰(공백으로 나눈 단어)별 평균 글자 확률(0~100).
// lines: [{text, probs, conf, x0, y0, x1, y1}]  (probs는 text의 글자(코드포인트)와 1:1)
export function linesToBlocks(lines) {
  const out = [];
  for (const l of lines) {
    const cps = [...l.text], aligned = Array.isArray(l.probs) && l.probs.length === cps.length;
    let items = cps.map((ch, i) => ({ ch, p: aligned ? l.probs[i] : l.conf }));
    while (items.length && items[0].ch === " ") items.shift();
    while (items.length && items[items.length - 1].ch === " ") items.pop();
    const spaced = [];
    for (let i = 0; i < items.length; i++) {            // 구두점 뒤 공백 보정 (fixPunctSpacing과 같은 규칙)
      spaced.push(items[i]); const a = items[i].ch, b = items[i + 1]?.ch;
      if (b !== undefined && ((".,?!".includes(a) && /[가-힣]/.test(b)) || (",?!".includes(a) && /[A-Za-z]/.test(b)))) spaced.push({ ch: " ", p: null });
    }
    const words = []; let cur = "", ps = [];
    const flush = () => { if (!cur) return; const v = ps.filter(x => x !== null); words.push({ text: cur, confidence: (v.length ? v.reduce((s, x) => s + x, 0) / v.length : l.conf) * 100 }); cur = ""; ps = []; };
    for (const it of spaced) { if (it.ch === " ") flush(); else { cur += it.ch; ps.push(it.p); } }
    flush();
    if (words.length) out.push({ text: words.map(w => w.text).join(" "), bbox: { x0: l.x0, y0: l.y0, x1: l.x1, y1: l.y1 }, words });
  }
  return [{ paragraphs: [{ lines: out }] }];
}
