import test from "node:test"; import assert from "node:assert/strict"; import { readFileSync } from "node:fs";
import { parseDocling } from "../js/docling-doc.js";
const fx = JSON.parse(readFileSync(new URL("./fixtures/docling-scanned-paper.json", import.meta.url), "utf-8"));   // 실제 docling.rs 출력(합성 2단 논문 1쪽)

test("Docling JSON: 읽기 순서, 종류, 그림·표 좌표(픽셀, 왼쪽 위 기준)", () => {
  const m = parseDocling(fx, () => 2), items = m.get(1);
  assert.equal(items[0].type, "h"); assert.match(items[0].text, /Bread Fermentation/);
  const kinds = items.map(i => i.type); assert.ok(kinds.includes("figure")); assert.ok(kinds.includes("table"));
  const fig = items.find(i => i.type === "figure").box, H = fx.pages["1"].size.height;
  assert.ok(fig.x0 > 0 && fig.x1 > fig.x0 && fig.y1 > fig.y0);
  assert.ok(Math.abs(fig.y0 - (H - 679.1) * 2) < 1.5, "BOTTOMLEFT 좌표를 위쪽 기준 픽셀로 바꿈");   // 그림 윗변 t=679.1pt
  assert.ok(items.filter(i => i.type === "p").every(i => i.text.length > 0));
});
test("Docling JSON(글자 PDF 경로): 번호 소제목 4개를 제목으로, 그림·표·캡션을 읽기 순서대로", () => {
  const fx2 = JSON.parse(readFileSync(new URL("./fixtures/docling-digital-paper.json", import.meta.url), "utf-8")), m = parseDocling(fx2, () => 2), p1 = m.get(1);
  assert.deepEqual(p1.filter(i => i.type === "h").map(i => i.text), ["A Study of Bread Fermentation Dynamics", "1. Introduction", "2. Methods", "3. Results", "4. Conclusion"]);
  const order = p1.map(i => i.type === "p" ? (i.text.startsWith("Table 1") ? "cap" : "p") : i.type).join(",");
  assert.match(order, /figure/); assert.match(order, /table,cap/);                       // 표 바로 뒤에 표 캡션
  assert.ok(m.get(2).some(i => i.type === "p" && /findings/.test(i.text)));               // 2쪽 본문
});
test("Docling JSON: 쪽 머리말·꼬리말은 제외, 수식은 이미지 영역으로, 목록 기호 보정", () => {
  const doc = { pages: { 1: { size: { width: 100, height: 200 } } }, body: { children: [{ $ref: "#/texts/0" }, { $ref: "#/texts/1" }, { $ref: "#/texts/2" }, { $ref: "#/groups/0" }] },
    groups: [{ children: [{ $ref: "#/texts/3" }] }],
    texts: [{ label: "page_header", text: "머리말", prov: [{ page_no: 1 }] }, { label: "formula", text: "x=y", prov: [{ page_no: 1, bbox: { l: 10, t: 150, r: 60, b: 130, coord_origin: "BOTTOMLEFT" } }] },
      { label: "section_header", level: 1, text: "서론", prov: [{ page_no: 1 }] }, { label: "list_item", text: "첫째", prov: [{ page_no: 1 }] }] };   // 한 항목 목록, 번호 없음 -> 문단
  const items = parseDocling(doc, () => 1).get(1);
  assert.deepEqual(items.map(i => i.type), ["figure", "h", "p"]); assert.equal(items[0].formula, true); assert.equal(items[2].text, "• 첫째");
  assert.deepEqual([items[0].box.y0, items[0].box.y1], [50, 70]);
});
