// PDF → EPUB 변환 화면. 사용자 파일에서 나온 모든 글은 textContent / createTextNode 로만 화면에 넣는다.
import { t } from "./i18n.js";
import { sanitizeFilename } from "./txt.js";
import { PDF_WARN_BYTES, PDF_MAX_BYTES, PDF_MAX_PAGES, MAX_EPUB_IMAGE_BYTES, PAPER_DIGITAL_MAX_BYTES } from "./limits.js";
import { ocrPage, textLinesToParas, markRunning, pagesToItems, scoreBlocks, pickBest } from "./layout.js";
import { buildEpub } from "./epub.js";
import { openPdfFile, readTextLines, renderToCanvas, canvasToJpeg, freeCanvas, rotateCanvas, grayCanvas } from "./pdf.js";
import { createEngine } from "./engine.js";
import { linesToBlocks } from "./ppocr-core.js";
import { parseDocling } from "./docling-doc.js";

const $ = id => document.getElementById(id);
const RECYCLE_PDF_PAGES = 25;   // 이 쪽 수마다 PDF 연결을 새로 열어 pdf.js가 쌓아 둔 메모리를 비운다 (수 GB 파일 대비)
const RECYCLE_OCR_PAGES = 100;  // 이 쪽 수마다 Tesseract 엔진을 새로 시작해 WebAssembly 메모리 증가를 막는다
const RECYCLE_ENGINE_PAGES = 20; // 책 모드(ONNX) 엔진은 메모리가 더 빨리 늘어서 더 자주 새로 시작한다
const RETRY_BELOW = 82;                 // 첫 인식의 평균 신뢰도가 이 값 미만이면 기울기를 바꿔 다시 인식한다
const GOOD_ENOUGH = 85;                 // 재시도 중 이 신뢰도 이상이 나오면 멈춘다
const RETRY_ANGLES = [-2, 2, -1, 1];    // 시도할 각도(도). 시험에서 효과가 있던 작은 각도만 사용
const PAPER_LONG_SIDE = 1700;          // 논문 모드: 쪽을 이 크기(긴 변 픽셀)로 그려 Docling에 넘긴다. 그림·표 자르기도 같은 크기를 쓴다
const st = { engine: "book", file: null, pdf: null, name: "", size: 0, pages: [], cur: 0, busy: false, cancel: false, previewToken: 0 };

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else e.setAttribute(k, v); }
  for (const k of kids) e.append(k);
  return e;
}
const msg = (text, bad = true) => { const m = $("cvMsg"); m.textContent = text; m.className = (bad ? "notice" : "muted") + " small"; };
const mb = n => (n / 1048576).toFixed(1);

async function recyclePdf() { try { await st.pdf.destroy(); } catch {} st.pdf = await openPdfFile(st.file); }

// ---------- 파일 열기 ----------
async function onFile(file) {
  if (!file || st.busy) return;
  msg("");
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return msg(t("cv.err.notPdf"));
  if (file.size > PDF_MAX_BYTES) return msg(t("cv.err.tooLarge"));
  if (file.size > PDF_WARN_BYTES && !confirm(t("cv.warnBig", { mb: mb(file.size) }))) return;
  try {
    const head = new TextDecoder("latin1").decode(new Uint8Array(await file.slice(0, 1024).arrayBuffer()));
    if (!head.includes("%PDF-")) return msg(t("cv.err.notPdf"));
    if (st.pdf) { try { await st.pdf.destroy(); } catch {} }
    st.pdf = await openPdfFile(file);          // 통째로 읽지 않고 필요한 부분만 읽는다
    if (st.pdf.numPages > PDF_MAX_PAGES) { const n = st.pdf.numPages; await st.pdf.destroy(); st.pdf = null; return msg(t("cv.err.pages", { max: PDF_MAX_PAGES }) + " (" + n + ")"); }
    st.file = file; st.name = file.name; st.size = file.size; st.pages = [];
    $("cvFrom").value = "1"; $("cvTo").value = String(st.pdf.numPages); $("cvFrom").max = $("cvTo").max = String(st.pdf.numPages);
    $("cvReview").hidden = true; $("cvStart").disabled = false;
    $("metaTitle").value = sanitizeFilename(file.name).slice(0, 200);
    refreshInfo();
  } catch { st.pdf = null; $("cvStart").disabled = true; msg(t("cv.err.open")); }
}
export function refreshInfo() {
  $("cvInfo").textContent = st.pdf ? t("cv.info", { name: st.name, n: st.pdf.numPages, mb: mb(st.size) }) : "";
  if (!$("cvReview").hidden) showPage(st.cur, true);
}

// ---------- 변환(글자 읽기 + OCR) ----------
const opt = () => ({
  engine: $("cvEngine").value, elang: $("cvLang").value === "en" ? "en" : "ko",
  langs: $("cvLang").value === "ko" ? ["kor"] : $("cvLang").value === "en" ? ["eng"] : ["kor", "eng"],
  longSide: $("cvQuality").value === "hi" ? 2400 : 1600,
  mode: $("cvMode").value, running: $("cvRunning").checked, retry: $("cvRetry").checked, forceOcr: $("cvForceOcr").checked, autoImg: $("cvAutoImg").checked,
});
const fmtEta = s => (s < 0 || !isFinite(s)) ? t("cv.eta.calc") : s >= 60 ? t("cv.eta.min", { m: Math.ceil(s / 60) }) : t("cv.eta.sec", { s: Math.ceil(s) });

async function start() {
  if (!st.pdf || st.busy) return;
  st.busy = true; st.cancel = false; msg("");
  const o = opt(), total = st.pdf.numPages, pages = [];
  let from = parseInt($("cvFrom").value, 10) || 1, to = parseInt($("cvTo").value, 10) || total;
  from = Math.max(1, Math.min(total, from)); to = Math.max(from, Math.min(total, to));
  $("cvFrom").value = String(from); $("cvTo").value = String(to);
  const n = to - from + 1;
  let lock = null; try { lock = await navigator.wakeLock?.request("screen"); } catch {}   // 오래 걸리는 작업 중 화면 꺼짐 방지
  $("cvStart").disabled = true; $("cvCancel").hidden = false; $("cvProg").hidden = false; $("cvProg").value = 0; $("cvReview").hidden = true;
  let ocr = null, ocrCount = 0, eng = null, engCount = 0; const t0 = performance.now();
  st.engine = o.engine;
  try {
    let paperPages = null;
    if (o.engine === "paper") { paperPages = await runPaper(o, from, to, t0); if (!paperPages) { msg(t("cv.cancelled"), false); return; } }
    for (let i = from; !paperPages && i <= to; i++) {
      if (st.cancel) break;
      if (i > from && (i - from) % RECYCLE_PDF_PAGES === 0) await recyclePdf();
      if (ocr && ocrCount >= RECYCLE_OCR_PAGES) { try { await ocr.terminate(); } catch {} ocr = null; ocrCount = 0; }
      const page = await st.pdf.getPage(i);
      const tl = await readTextLines(page);
      let paras, src, conf = 100, tilt = 0;
      if (tl.chars >= 20 && !o.forceOcr) { paras = textLinesToParas(tl.lines, tl.H); src = "text"; }
      else if (o.engine === "book") {                                   // 책 모드: PP-OCR 한국어 + 글줄 펴기
        if (eng && engCount >= RECYCLE_ENGINE_PAGES) { eng.terminate(); eng = null; engCount = 0; }
        if (!eng) {
          $("cvStatus").textContent = t("cv.loadEngine");
          try { eng = createEngine(); await eng.initBook(o.elang); } catch { throw Object.assign(new Error("ENG"), { code: "cv.err.engine" }); }
        }
        const r = await bookPage(eng, page, o, o.longSide); engCount++;
        paras = r.paras; conf = r.conf; src = "ocr";
      } else {                                                          // 빠른 모드: Tesseract (기존)
        if (!ocr) {
          $("cvStatus").textContent = t("cv.loadEngine");
          try { const { createOcr } = await import("./ocr.js"); ocr = await createOcr(o.langs); }
          catch { throw Object.assign(new Error("OCR"), { code: "cv.err.ocr" }); }
        }
        const r = await ocrWithRetry(ocr, page, o, false);
        ocrCount += r.passes;
        paras = r.paras; conf = r.conf; tilt = r.tilt; src = "ocr";
      }
      const chars = paras.reduce((s, p) => s + p.text.length, 0);
      let mode = o.mode;
      if (chars < 5) mode = "image";                                   // 글이 거의 없는 쪽(사진 등)은 이미지로
      else if (src === "ocr" && o.autoImg && conf < 60) mode = "image"; // 선택 옵션: 신뢰도 낮은 쪽 자동 이미지화
      pages.push({ n: i, paras, src, conf, tilt, mode, low: paras.reduce((s, p) => s + p.words.filter(w => w.low).length, 0), rows: null });
      page.cleanup();
      const el_s = (performance.now() - t0) / 1000;
      const done = i - from + 1;
      $("cvProg").value = (done / n) * 100;
      $("cvStatus").textContent = t("cv.prog", { i: done, n, eta: done >= 2 ? fmtEta(el_s / done * (n - done)) : t("cv.eta.calc") });
    }
    if (st.cancel) { msg(t("cv.cancelled"), false); return; }
    const done_pages = paperPages || pages;
    if (o.running && !paperPages) { const removed = markRunning(pages); st.removed = removed; } else st.removed = 0;
    st.pages = done_pages; st.cur = 0;
    const need = done_pages.filter(needsCheck).length;
    $("cvStatus").textContent = t("cv.done", { n, k: need });
    $("cvReview").hidden = false; showPage(0, true);
  } catch (e) { msg(t(e && e.code ? e.code : "cv.err.run")); }
  finally {
    if (ocr) { try { await ocr.terminate(); } catch {} }
    if (eng) { try { eng.terminate(); } catch {} }
    try { await lock?.release(); } catch {}
    st.busy = false; $("cvStart").disabled = false; $("cvCancel").hidden = true; $("cvProg").hidden = true;
  }
}
// 책 모드: 쪽을 그려 PP-OCR 엔진에 넘기고, 돌아온 글줄을 문단으로 묶는다
async function bookPage(eng, page, o, longSide) {
  const canvas = await renderToCanvas(page, { longSide }), W = canvas.width, H = canvas.height;
  const img = canvas.getContext("2d").getImageData(0, 0, W, H); freeCanvas(canvas);
  const r = await eng.book(img, o.elang), blocks = linesToBlocks(r.lines);
  return { paras: ocrPage(blocks, W, H), conf: scoreBlocks(blocks).conf };
}
const toWords = text => text.split(/\s+/).filter(Boolean).map(w => ({ t: w, low: false, glue: false }));
// 논문 모드: Docling이 레이아웃(읽기 순서·제목·그림·표)을 분석한다. 글자 PDF면 OCR 없이 PDF의 글자를 쓰고, 스캔이면 한국어/영어 인식 모델로 읽는다.
async function runPaper(o, from, to, t0) {
  const n = to - from + 1, eng = createEngine();
  try {
    $("cvStatus").textContent = t("cv.loadEngine");
    let digital = false;
    if (st.size <= PAPER_DIGITAL_MAX_BYTES && !o.forceOcr) {
      for (let i = from; i <= Math.min(to, from + 2) && !digital; i++) { const pg = await st.pdf.getPage(i); const tl = await readTextLines(pg); pg.cleanup(); if (tl.chars >= 20) digital = true; }
    }
    let b;
    try {
      b = await eng.paperBegin(digital ? "digital" : "scanned", o.elang, digital ? await st.file.arrayBuffer() : undefined);
      if (b.mode === "none") { digital = false; b = await eng.paperBegin("scanned", o.elang); }   // 글자 층을 못 읽으면 OCR 경로로
    } catch { throw Object.assign(new Error("ENG"), { code: "cv.err.engine" }); }
    const scales = {};
    for (let i = from; i <= to; i++) {
      if (st.cancel) return null;
      if (i > from && (i - from) % RECYCLE_PDF_PAGES === 0) await recyclePdf();
      const page = await st.pdf.getPage(i), vp = page.getViewport({ scale: 1 }), c = await renderToCanvas(page, { longSide: PAPER_LONG_SIDE }), s = c.width / vp.width;
      scales[i] = s; const img = c.getContext("2d").getImageData(0, 0, c.width, c.height); freeCanvas(c);
      await eng.paperPage(digital ? i - 1 : i - from, img, s); page.cleanup();
      const done = i - from + 1, el_s = (performance.now() - t0) / 1000;
      $("cvProg").value = (done / n) * 100 * 0.97;
      $("cvStatus").textContent = t("cv.prog", { i: done, n, eta: done >= 2 ? fmtEta(el_s / done * (n - done)) : t("cv.eta.calc") });
    }
    const { json } = await eng.paperFinish(st.name);
    const byNo = parseDocling(json, no => scales[digital ? no : from + no - 1] ?? 1), pages = [];
    for (let i = from; i <= to; i++) {
      const items = byNo.get(digital ? i : i - from + 1) || [], paras = [];
      items.forEach((it, k) => {
        if (it.type === "figure" || it.type === "table") { if (it.box) paras.push({ img: true, kind: it.type === "table" ? "table" : it.formula ? "formula" : "figure", key: `${i}-${k}`, page: i, box: it.box, text: "", words: [], removed: false, heading: false }); }
        else paras.push({ words: toWords(it.text), text: it.text, heading: it.type === "h", removed: false, lines: 1, lh: 0.02, y0: 0.5, y1: 0.5 });
      });
      pages.push({ n: i, paras, src: digital ? "text" : "ocr", conf: 100, tilt: 0, mode: items.length ? o.mode : "image", low: 0, rows: null });
    }
    return pages;
  } finally { try { eng.terminate(); } catch {} }
}
// 쪽 한 장을 OCR한다. 재시도 조건이면(또는 force) 작은 각도로 돌려 다시 인식하고 가장 좋은 결과를 고른다.
async function ocrWithRetry(ocr, page, o, force) {
  const canvas = await renderToCanvas(page, { longSide: o.longSide });
  try {
    const first = await ocr.recognize(canvas);
    const cands = [{ blocks: first, W: canvas.width, H: canvas.height, angle: 0, ...scoreBlocks(first) }];
    if ((force || o.retry) && cands[0].conf < (force ? 101 : RETRY_BELOW)) {
      for (const ang of RETRY_ANGLES) {
        if (st.cancel || pickBest(cands).conf >= GOOD_ENOUGH) break;
        const rc = rotateCanvas(canvas, ang);
        try { const b = await ocr.recognize(rc); cands.push({ blocks: b, W: rc.width, H: rc.height, angle: ang, ...scoreBlocks(b) }); }
        finally { freeCanvas(rc); }
      }
    }
    const best = cands.length > 1 ? pickBest(cands) : cands[0];
    return { paras: ocrPage(best.blocks, best.W, best.H), conf: best.conf, tilt: best.angle, passes: cands.length };
  } finally { freeCanvas(canvas); }
}
// 검토 화면에서 이 쪽만 다시 인식 (기울기 재시도를 항상 사용)
async function reocr() {
  const pg = st.pages[st.cur];
  if (st.busy || !pg || !confirm(t("cv.reocr.warn"))) return;
  st.busy = true; $("cvReocr").disabled = true; $("cvPageInfo").textContent = t("cv.loadEngine"); msg("");
  let ocr = null, eng = null;
  try {
    const o = opt(); let r;
    if (st.engine === "book") {                       // 책 모드: 더 높은 해상도(긴 변 2400px)로 다시 읽는다
      try { eng = createEngine(); await eng.initBook(o.elang); } catch { throw Object.assign(new Error("ENG"), { code: "cv.err.engine" }); }
      const page = await st.pdf.getPage(pg.n); r = { ...(await bookPage(eng, page, o, 2400)), tilt: 0 }; page.cleanup();
    } else {
      try { const { createOcr } = await import("./ocr.js"); ocr = await createOcr(o.langs); } catch { throw Object.assign(new Error("OCR"), { code: "cv.err.ocr" }); }
      const page = await st.pdf.getPage(pg.n);
      r = await ocrWithRetry(ocr, page, o, true); page.cleanup();
    }
    pg.paras = r.paras; pg.conf = r.conf; pg.tilt = r.tilt; pg.src = "ocr"; pg.rows = null;
    pg.low = r.paras.reduce((s, p) => s + p.words.filter(w => w.low).length, 0);
    if (o.running) st.removed = (st.removed || 0) + markRunning(st.pages);
    showPage(st.cur, true);
  } catch (e) { msg(t(e && e.code ? e.code : "cv.err.run")); showPage(st.cur, true); }
  finally { if (ocr) { try { await ocr.terminate(); } catch {} } if (eng) { try { eng.terminate(); } catch {} } st.busy = false; $("cvReocr").disabled = false; }
}

const needsCheck = p => p.low > 0 && (p.mode === "text" || p.mode === "both");

// ---------- 검토 화면 ----------
function makeFigRow(para) {
  const row = el("div", { class: "pr fig" + (para.removed ? " removed" : "") }); row._para = para;
  const body = el("div", { class: "pt figbody" }), thumb = el("div", { class: "figthumb" });
  body.append(el("div", { class: "figlabel", text: t(para.kind === "table" ? "cv.fig.table" : para.kind === "formula" ? "cv.fig.formula" : "cv.fig.figure") }), thumb);
  const bar = el("div", { class: "pb" }), bX = el("button", { type: "button", class: "mini", text: para.removed ? t("cv.btn.restore") : t("cv.btn.remove") });
  bX.onclick = () => { row.classList.toggle("removed"); bX.textContent = row.classList.contains("removed") ? t("cv.btn.restore") : t("cv.btn.remove"); };
  bar.append(bX); row.append(body, bar); drawFigThumb(thumb, para);
  return row;
}
async function drawFigThumb(box, para) {
  try {
    const page = await st.pdf.getPage(para.page), c = await renderToCanvas(page, { longSide: PAPER_LONG_SIDE }), b = para.box;
    const sx = Math.max(0, Math.floor(b.x0)), sy = Math.max(0, Math.floor(b.y0)), sw = Math.max(1, Math.min(c.width - sx, Math.ceil(b.x1 - b.x0))), sh = Math.max(1, Math.min(c.height - sy, Math.ceil(b.y1 - b.y0)));
    const k = Math.min(1, 360 / sw), t2 = document.createElement("canvas"); t2.width = Math.max(1, Math.round(sw * k)); t2.height = Math.max(1, Math.round(sh * k));
    t2.getContext("2d").drawImage(c, sx, sy, sw, sh, 0, 0, t2.width, t2.height); box.replaceChildren(t2); freeCanvas(c); page.cleanup();
  } catch { /* 미리보기 실패는 무시 */ }
}
function makeRow(para) {
  if (para.img) return makeFigRow(para);
  const row = el("div", { class: "pr" + (para.heading ? " heading" : "") + (para.removed ? " removed" : "") });
  const body = el("p", { class: "pt", contenteditable: "true", spellcheck: "false" });
  para.words.forEach((w, i) => {
    if (i && !w.glue) body.append(document.createTextNode(" "));
    if (w.low) body.append(el("span", { class: "low", text: w.t })); else body.append(document.createTextNode(w.t));
  });
  const bar = el("div", { class: "pb" });
  const bH = el("button", { type: "button", class: "mini", text: t("cv.btn.heading") });
  const bX = el("button", { type: "button", class: "mini", text: row.classList.contains("removed") ? t("cv.btn.restore") : t("cv.btn.remove") });
  bH.onclick = () => row.classList.toggle("heading");
  bX.onclick = () => { row.classList.toggle("removed"); bX.textContent = row.classList.contains("removed") ? t("cv.btn.restore") : t("cv.btn.remove"); };
  bar.append(bH, bX);
  body.addEventListener("paste", e => { e.preventDefault(); const tx = (e.clipboardData?.getData("text/plain") || "").replace(/\s*\n\s*/g, " "); document.execCommand("insertText", false, tx); });
  body.addEventListener("drop", e => e.preventDefault());
  body.addEventListener("keydown", e => onKey(e, row, body));
  row.append(body, bar);
  return row;
}
function onKey(e, row, body) {
  const sel = getSelection(); if (!sel.rangeCount) return;
  const r = sel.getRangeAt(0);
  if (e.key === "Enter") {                       // 문단 나누기
    e.preventDefault(); r.deleteContents();
    const tail = document.createRange(); tail.setStart(r.endContainer, r.endOffset); tail.setEnd(body, body.childNodes.length);
    const row2 = makeRow({ words: [], heading: false, removed: false }), b2 = row2.querySelector(".pt");
    b2.append(tail.extractContents()); row.after(row2);
    const nr = document.createRange(); nr.setStart(b2, 0); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); b2.focus();
  } else if (e.key === "Backspace" && r.collapsed && row.previousElementSibling) {   // 앞 문단과 합치기
    const pre = document.createRange(); pre.selectNodeContents(body); pre.setEnd(r.startContainer, r.startOffset);
    if (pre.toString().length) return;
    e.preventDefault();
    const pb = row.previousElementSibling.querySelector(".pt"), at = pb.childNodes.length;
    if (pb.textContent && body.textContent) pb.append(document.createTextNode(" "));
    while (body.firstChild) pb.append(body.firstChild);
    row.remove();
    const nr = document.createRange(); nr.setStart(pb, Math.min(at, pb.childNodes.length)); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); pb.focus();
  }
}
function captureCurrent() {          // 현재 쪽 편집 내용을 보관
  const ed = $("cvEditor"), pg = st.pages[st.cur];
  if (pg && ed.dataset.page === String(pg.n)) pg.rows = [...ed.children].filter(c => c.classList.contains("pr"));
}
function showPage(i, force = false) {
  if (!st.pages.length) return;
  if (!force) captureCurrent();
  i = Math.max(0, Math.min(st.pages.length - 1, i)); st.cur = i;
  const pg = st.pages[i], ed = $("cvEditor");
  ed.replaceChildren(); ed.dataset.page = String(pg.n);
  if (!pg.rows) pg.rows = pg.paras.map(makeRow);
  if (!pg.rows.length) ed.append(el("p", { class: "muted small", text: t("cv.noText") }));
  pg.rows.forEach(r => ed.append(r));
  $("cvPageNo").textContent = t("cv.page", { i: pg.n, n: st.pdf.numPages });
  $("cvGoto").value = String(pg.n);
  $("cvPageMode").value = pg.mode;
  $("cvPageInfo").textContent = (pg.src === "ocr" ? t("cv.srcOcr") + " · " + t("cv.conf", { c: Math.round(pg.conf) }) + (pg.tilt ? " · " + t("cv.tilt", { a: (pg.tilt > 0 ? "+" : "") + pg.tilt }) : "") : t("cv.srcText")) + (pg.low ? " · " + t("cv.lowCount", { k: pg.low }) : "");
  $("cvRemoved").textContent = st.removed ? t("cv.removedAuto", { n: st.removed }) : "";
  $("cvReocr").hidden = st.engine === "paper"; $("cvReocr").textContent = t(st.engine === "book" ? "cv.reocr.book" : "cv.reocr");
  drawPreview(pg.n);
}
async function drawPreview(n) {
  const tok = ++st.previewToken, box = $("cvPreview");
  try {
    const page = await st.pdf.getPage(n);
    const c = await renderToCanvas(page, { maxW: 420, maxH: 560 });
    if (tok !== st.previewToken) { freeCanvas(c); return; }
    c.className = "pvimg"; box.replaceChildren(c); page.cleanup();
  } catch { if (tok === st.previewToken) box.replaceChildren(); }
}

// ---------- EPUB 만들기 ----------
function collectRow(r) { if (r._para?.img) return { ...r._para, removed: r.classList.contains("removed") }; return { text: r.querySelector(".pt")?.textContent ?? "", heading: r.classList.contains("heading"), removed: r.classList.contains("removed") }; }
async function build() {
  if (st.busy || !st.pages.length) return;
  st.busy = true; msg(""); captureCurrent();
  const btn = $("cvBuild"); btn.disabled = true;
  try {
    if (typeof window.JSZip !== "function") throw new Error("JSZip");
    const pages = st.pages.map(p => ({ n: p.n, mode: p.mode, paras: p.rows ? p.rows.map(collectRow) : p.paras }));
    const items = pagesToItems(pages);
    if (!items.length) return msg(t("cv.err.empty"));
    const gray = $("cvColor").value === "gray", big = $("cvRes").value === "large";
    const box = big ? { maxW: 960, maxH: 1600 } : { maxW: 480, maxH: 800 };
    const need = new Set(items.filter(i => i.type === "img" && i.key === undefined).map(i => i.page));
    const wantCover = $("cvCover").checked;
    const coverPage = st.pages[0]?.n ?? 1;
    if (wantCover) need.add(coverPage);
    const images = new Map(); let k = 0, imgBytes = 0;
    for (const n of [...need].sort((a, b) => a - b)) {
      $("cvStatus").textContent = t("cv.building", { i: ++k, n: need.size });
      if (k > 1 && (k - 1) % RECYCLE_PDF_PAGES === 0) await recyclePdf();
      const page = await st.pdf.getPage(n);
      const c = await renderToCanvas(page, { ...box, gray });
      const im = await canvasToJpeg(c, 0.82); freeCanvas(c); page.cleanup();
      imgBytes += im.bytes.length;
      if (imgBytes > MAX_EPUB_IMAGE_BYTES) throw Object.assign(new Error("BIG"), { code: "cv.err.epubBig" });
      images.set(n, im);
    }
    // 논문 모드: 분석된 그림·표·수식 영역을 쪽 그림에서 잘라 이미지로 만든다 (쪽마다 한 번만 그린다)
    const figs = items.filter(i => i.type === "img" && i.key !== undefined), figPara = new Map();
    for (const pg of pages) for (const q of pg.paras) if (q.img) figPara.set(q.key, q);
    const byPage = new Map(); for (const f of figs) { const q = figPara.get(f.key); if (!q) continue; if (!byPage.has(q.page)) byPage.set(q.page, []); byPage.get(q.page).push(q); }
    for (const [pn, list] of [...byPage.entries()].sort((a, b) => a[0] - b[0])) {
      $("cvStatus").textContent = t("cv.building", { i: ++k, n: need.size + byPage.size });
      if (k > 1 && (k - 1) % RECYCLE_PDF_PAGES === 0) await recyclePdf();
      const page = await st.pdf.getPage(pn), c = await renderToCanvas(page, { longSide: PAPER_LONG_SIDE });
      for (const q of list) {
        const b = q.box, sx = Math.max(0, Math.floor(b.x0)), sy = Math.max(0, Math.floor(b.y0)), sw = Math.max(1, Math.min(c.width - sx, Math.ceil(b.x1 - b.x0))), sh = Math.max(1, Math.min(c.height - sy, Math.ceil(b.y1 - b.y0)));
        const k2 = Math.min(1, box.maxW / sw, box.maxH / sh), cc = document.createElement("canvas"); cc.width = Math.max(1, Math.round(sw * k2)); cc.height = Math.max(1, Math.round(sh * k2));
        const g = cc.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cc.width, cc.height); g.imageSmoothingQuality = "high"; g.drawImage(c, sx, sy, sw, sh, 0, 0, cc.width, cc.height);
        if (gray) grayCanvas(cc);
        const im = await canvasToJpeg(cc, 0.85); freeCanvas(cc); imgBytes += im.bytes.length;
        if (imgBytes > MAX_EPUB_IMAGE_BYTES) throw Object.assign(new Error("BIG"), { code: "cv.err.epubBig" });
        images.set(q.key, im);
      }
      freeCanvas(c); page.cleanup();
    }
    const lang = $("metaLang").value, title = $("metaTitle").value.trim() || sanitizeFilename(st.name);
    const label = (a, b) => (a === b ? t("cv.pl1", { a }) : t("cv.pl2", { a, b }));
    const out = await buildEpub(window.JSZip, { title, author: $("metaAuthor").value.trim(), lang, items, images, cover: wantCover ? images.get(coverPage) : null, label });
    const name = (sanitizeFilename(title, false).replace(/^\.+/, "") || "book") + ".epub";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([out.bytes], { type: "application/epub+zip" })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    $("cvStatus").textContent = ""; msg(t("cv.built", { name, mb: mb(out.bytes.length) }), false);
  } catch (e) { msg(t(e && e.code ? e.code : "cv.err.build")); }
  finally { st.busy = false; btn.disabled = false; }
}

// ---------- 연결 ----------
export function initConvert() {
  $("cvFile").onchange = e => { onFile(e.target.files[0]); e.target.value = ""; };
  const drop = $("cvDrop");
  ["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => onFile(e.dataTransfer.files[0]));
  $("cvStart").onclick = start; $("cvStart").disabled = true;
  $("cvCancel").onclick = () => { st.cancel = true; };
  $("cvPrev").onclick = () => showPage(st.cur - 1);
  $("cvNext").onclick = () => showPage(st.cur + 1);
  $("cvNextCheck").onclick = () => {
    const n = st.pages.length;
    for (let d = 1; d <= n; d++) { const j = (st.cur + d) % n; if (needsCheck(st.pages[j])) { showPage(j); return; } }
  };
  $("cvGoto").onchange = e => { const v = parseInt(e.target.value, 10), j = st.pages.findIndex(p => p.n === v); if (j >= 0) showPage(j); };
  $("cvPageMode").onchange = e => { const pg = st.pages[st.cur]; if (pg) pg.mode = e.target.value; };
  $("cvBuild").onclick = build;
  $("cvReocr").onclick = reocr;
  addEventListener("beforeunload", e => { if (st.pages.length) { e.preventDefault(); e.returnValue = ""; } });
}
