// 인식 엔진 작업자(Worker): ONNX Runtime Web(WASM, 단일 스레드)로 PP-OCR과 Docling을 실행한다.
// 작업자는 메인 페이지의 CSP를 받지 않으므로 CSP를 열지 않고도 WASM이 동작한다. 모든 파일은 vendor/ 에서만 읽는다.
import * as ort from "../vendor/ort/ort.wasm.min.mjs";
import { DET, BAND, detInput, labelComponents, keepComp, straightenLine, prepareRec, parseDict, ctcDecode } from "./ppocr-core.js";

ort.env.wasm.wasmPaths = new URL("../vendor/ort/", import.meta.url).href;
ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false; ort.env.logLevel = "error";
const V = new URL("../vendor/", import.meta.url);
const buf = async p => new Uint8Array(await (await fetch(new URL(p, V))).arrayBuffer());
const txt = async p => (await fetch(new URL(p, V))).text();
// 입력 길이가 줄마다 달라서 메모리 풀을 켜 두면 쪽을 처리할수록 메모리가 계속 커진다 -> 풀·메모리 패턴을 끈다
const sess = async p => ort.InferenceSession.create(await buf(p), { executionProviders: ["wasm"], logSeverityLevel: 3, enableCpuMemArena: false, enableMemPattern: false });
const recFiles = { ko: ["ppocr/korean_pp-ocrv5_mobile_rec.onnx", "ppocr/ppocrv5_korean_dict.txt"], en: ["ppocr/ocr_rec_en.onnx", "ppocr/en_dict.txt"] };

let det = null, recs = {}, layoutSess = null, dl = null, conv = null, convMode = "";
async function loadRec(lang) {
  if (recs[lang]) return recs[lang];
  const [m, d] = recFiles[lang]; const s = await sess(m), dictText = await txt(d);
  return (recs[lang] = { s, dictText, chars: parseDict(dictText) });
}
// 한 쪽의 글줄 인식 (책 모드): 검출 -> 글줄 덩어리 -> 펴기 -> 인식 -> CTC
async function recognizeBook(rgba, w, h, lang) {
  const r = await loadRec(lang), t0 = performance.now();
  const { data, W, H, img } = detInput(new Uint8ClampedArray(rgba), w, h, DET.k);
  const o = await det.run({ [det.inputNames[0]]: new ort.Tensor("float32", data, [1, 3, H, W]) });
  const prob = o[det.outputNames[0]].data, { labels, comps } = labelComponents(prob, W, H, DET.thresh);
  const crops = [];
  for (const c of comps.filter(c => keepComp(c)).sort((a, b) => a.y0 - b.y0)) { const s = straightenLine(img, W, H, labels, c, BAND); if (s) crops.push(s); }
  const order = crops.map((c, i) => i).sort((a, b) => crops[a].w / crops[a].h - crops[b].w / crops[b].h), lines = new Array(crops.length), sx = w / W, sy = h / H;
  for (let i = 0; i < order.length; i += 4) {                              // 비슷한 길이끼리 4줄씩 묶어 여백을 줄인다
    const idx = order.slice(i, i + 4), batch = prepareRec(idx.map(j => crops[j]));
    const out = await r.s.run({ [r.s.inputNames[0]]: new ort.Tensor("float32", batch.data, [batch.n, 3, batch.h, batch.w]) });
    const t = out[r.s.outputNames[0]], [n, T, C] = t.dims, dec = ctcDecode(t.data, n, T, C, r.chars);
    idx.forEach((j, q) => { const c = crops[j];
      // 검출 덩어리는 실제 글자보다 얇다(글자 높이는 약 2.5배) -> 줄 상자 높이를 글자 높이에 맞춘다
      lines[j] = { text: dec[q].text, probs: dec[q].probs, conf: dec[q].conf, x0: c.x0 * sx, x1: c.x1 * sx, y0: (c.cy - 1.25 * c.thick) * sy, y1: (c.cy + 1.25 * c.thick) * sy }; });
  }
  return { lines: lines.filter(l => l && l.text.trim()).sort((a, b) => a.y0 - b.y0), ms: Math.round(performance.now() - t0), comps: crops.length };
}
async function initDocling() {
  if (dl) return;
  dl = await import("../vendor/docling/docling_wasm.js");
  await dl.default({ module_or_path: new URL("docling/docling_wasm_bg.wasm", V) });
  layoutSess = await sess("docling/layout_heron_int8.onnx");
}
const wrappers = rs => ({
  layout: { run: async data => { const r = await layoutSess.run({ pixel_values: new ort.Tensor("float32", data, [1, 3, 640, 640]) }); const t = n => ({ data: r[n].data, dims: Array.from(r[n].dims) }); return { logits: t("logits"), boxes: t("pred_boxes") }; } },
  rec: { run: async (n, h, w, data) => { const r = await rs.run({ [rs.inputNames[0]]: new ort.Tensor("float32", data, [n, 3, h, w]) }); const t = r[rs.outputNames[0]]; return { data: t.data, dims: Array.from(t.dims) }; } },
});
let wr = null;
const handlers = {
  async initBook({ lang }) { if (!det) det = await sess("ppocr/pp-ocrv5_mobile_det.onnx"); await loadRec(lang); return {}; },
  async book({ rgba, w, h, lang }) { return recognizeBook(rgba, w, h, lang); },
  // 논문 모드: mode "digital"(글자 있는 PDF, OCR 없음) 또는 "scanned"(OCR)
  async paperBegin({ mode, lang, pdf }) {
    await initDocling(); const r = mode === "digital" ? null : await loadRec(lang); wr = wrappers(r ? r.s : null);   // 글자 PDF는 OCR이 필요 없다
    if (conv) { try { conv.free(); } catch {} conv = null; }
    if (mode === "digital") { try { conv = new dl.DigitalConverter(new Uint8Array(pdf)); convMode = "digital"; return { mode: "digital", pages: conv.page_count() }; } catch (e) { return { mode: "none", reason: String(e) }; } }
    conv = new dl.ScannedConverter(r.dictText); convMode = "scanned"; return { mode: "scanned" };
  },
  async paperPage({ index, rgba, w, h, scale }) {
    const px = new Uint8Array(rgba);
    if (convMode === "digital") await conv.add_page(index, px, w, h, scale, wr.layout, null); else await conv.add_page(px, w, h, scale, wr.layout, wr.rec);
    return {};
  },
  async paperFinish({ name }) { const j = conv.finish(name || "doc", "json", "placeholder"); try { conv.free(); } catch {} conv = null; return { json: j }; },
};
onmessage = async e => {
  const { cmd, id, ...rest } = e.data;
  try { postMessage({ id, ok: true, ...(await handlers[cmd](rest)) }); }
  catch (err) { postMessage({ id, ok: false, error: String((err && err.message) || err) }); }
};
