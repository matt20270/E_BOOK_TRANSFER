import test from "node:test"; import assert from "node:assert/strict";
import { resizeRGBA, detInput, labelComponents, keepComp, straightenLine, prepareRec, parseDict, ctcDecode, fixPunctSpacing, linesToBlocks } from "../js/ppocr-core.js";
import { ocrPage } from "../js/layout.js";

test("resizeRGBA: 같은 크기는 그대로, 2배 확대는 값 범위 유지", () => {
  const src = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]); assert.equal(resizeRGBA(src, 2, 1, 2, 1), src);
  const big = resizeRGBA(src, 2, 1, 4, 1); assert.equal(big.length, 16); assert.ok(big[0] === 0 && big[12] === 255 && big[4] > 0 && big[4] < 255);
});
test("detInput: 32의 배수로 맞추고 ImageNet 정규화", () => {
  const w = 70, h = 40, rgba = new Uint8ClampedArray(w * h * 4).fill(255), r = detInput(rgba, w, h, 1);
  assert.equal(r.W % 32, 0); assert.equal(r.H % 32, 0); assert.equal(r.data.length, 3 * r.W * r.H);
  assert.ok(Math.abs(r.data[0] - (1 - 0.485) / 0.229) < 1e-5);
});
// 기울어진 글줄 모양의 확률 지도를 만든다: 중심선 y = y0 + slope*x, 두께 thick
const makeMap = (W, H, y0, slope, thick, xa = 20, xb = W - 20) => { const p = new Float32Array(W * H);
  for (let x = xa; x < xb; x++) { const cy = y0 + slope * x; for (let y = Math.round(cy - thick / 2); y <= Math.round(cy + thick / 2); y++) if (y >= 0 && y < H) p[y * W + x] = 0.9; } return p; };
test("글줄 덩어리: 두 줄이 분리되고 작은 잡음은 걸러짐", () => {
  const W = 400, H = 200, p = makeMap(W, H, 50, 0.05, 24); const q = makeMap(W, H, 130, 0.05, 24); for (let i = 0; i < p.length; i++) p[i] = Math.max(p[i], q[i]); p[5 * W + 5] = 0.9;
  const { comps } = labelComponents(p, W, H, 0.5), kept = comps.filter(c => keepComp(c)); assert.equal(comps.length, 3); assert.equal(kept.length, 2);
});
test("휘어진 줄 펴기: 기울어진 선을 따라가며 두께·중심선 추정, 양끝 여백 추가", () => {
  const W = 400, H = 200, p = makeMap(W, H, 60, 0.1, 20), { labels, comps } = labelComponents(p, W, H, 0.5);
  const img = new Uint8ClampedArray(W * H * 4).fill(255);                         // 흰 바탕에 선 중심선 위치만 검게
  for (let x = 0; x < W; x++) { const y = Math.round(60 + 0.1 * x); for (let d = -3; d <= 3; d++) { const o = ((y + d) * W + x) * 4; img[o] = img[o + 1] = img[o + 2] = 0; } }
  const c = straightenLine(img, W, H, labels, comps[0]);
  assert.ok(c && c.thick > 18 && c.thick < 24); assert.ok(c.w > comps[0].w);        // 여백
  // 펴진 이미지의 검은 줄은 모든 열에서 같은 높이에 있어야 한다 (기울기가 제거됨)
  const rowOfDark = u => { let best = -1, v0 = 255; for (let v = 0; v < c.h; v++) { const val = c.data[(v * c.w + u) * 3]; if (val < v0) { v0 = val; best = v; } } return best; };
  const a = rowOfDark(Math.round(c.w * 0.25)), b = rowOfDark(Math.round(c.w * 0.75)); assert.ok(Math.abs(a - b) <= 2, `펴진 뒤 줄 높이 차이 ${a} vs ${b}`);
});
test("인식 입력: 폭은 가장 긴 줄에 맞추고 나머지는 0으로 채움, BGR 순서", () => {
  const mk = (w, v) => ({ data: new Uint8Array(w * 24 * 3).fill(v), w, h: 24 });
  const r = prepareRec([mk(48, 255), mk(480, 0)]); assert.equal(r.h, 48); assert.equal(r.w, 960); assert.equal(r.n, 2);
  assert.ok(Math.abs(r.data[0] - 1) < 1e-6);                                        // 흰색 -> +1
  assert.equal(r.data[960 - 1], 0);                                                  // 첫 줄의 오른쪽 여백
  assert.ok(Math.abs(r.data[3 * 48 * 960] - (-1)) < 1e-6);                          // 둘째 줄: 검정 -> -1
});
test("CTC 해석: 반복 합치기, 빈칸 제거, 글자별 확률", () => {
  const chars = parseDict("가\n나\n다\n"); assert.deepEqual(chars, ["", "가", "나", "다", " "]);
  const C = 5, T = 6, out = new Float32Array(T * C); const set = (t, c, p) => { out[t * C + c] = p; };
  [[1, .9], [1, .8], [0, .9], [1, .7], [4, .6], [3, .95]].forEach(([c, p], t) => set(t, c, p));    // 가 가 _ 가 ' ' 다
  const [r] = ctcDecode(out, 1, T, C, chars); assert.equal(r.text, "가가 다"); assert.equal(r.probs.length, 4); assert.ok(Math.abs(r.conf - (0.9 + 0.7 + 0.6 + 0.95) / 4) < 1e-6);
});
test("구두점 뒤 공백 보정", () => {
  assert.equal(fixPunctSpacing("빵.밀가루,효모"), "빵. 밀가루, 효모"); assert.equal(fixPunctSpacing("2.5도 60~80cm."), "2.5도 60~80cm."); assert.equal(fixPunctSpacing("a,b"), "a, b");
});
test("줄 -> blocks -> ocrPage: 신뢰도 낮은 단어 표시와 구두점 공백, 제목 구분", () => {
  const L = (text, p, y0, y1) => ({ text, probs: p ?? [...text].map(() => 0.95), conf: 0.95, x0: 100, y0, x1: 900, y1 });
  const lines = [L("바게트", null, 100, 160), L("빵.밀가루", [.95, .2, .95, .95, .95], 300, 320), L("이어진 줄입니다.", null, 325, 345), L("다음 문단", null, 440, 460), L("마지막 문단", null, 560, 580)];
  const paras = ocrPage(linesToBlocks(lines), 1000, 1000);
  assert.equal(paras[0].heading, true); assert.equal(paras[1].text, "빵. 밀가루 이어진 줄입니다.");
  assert.deepEqual(paras[1].words.map(w => w.low), [true, false, false, false]);   // "빵."의 확률 0.5 포함 평균 < 0.7
  assert.equal(paras.length, 4);
});
