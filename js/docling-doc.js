// Docling이 만든 JSON(DoclingDocument) -> 쪽별 읽기 순서 항목. DOM 없이 동작하므로 Node에서 시험할 수 있다.
// 좌표: PDF 포인트(왼쪽 아래 기준)를 래스터 픽셀(왼쪽 위 기준)로 바꿔 돌려준다.
const HEADING = new Set(["title", "section_header"]);
const SKIP = new Set(["page_header", "page_footer"]);
const CROP = new Set(["formula"]);                       // 수식은 글자로 읽으면 깨지므로 이미지로 자른다
const LIST = /^\s*([-*•·▪]|\d+[.)]|[①-⑩])\s/;

export function parseDocling(json, scaleOf) {
  const doc = typeof json === "string" ? JSON.parse(json) : json, byPage = new Map();
  const pageH = no => doc.pages?.[String(no)]?.size?.height ?? 0;
  const box = (prov, no) => {
    const b = prov?.bbox; if (!b) return null; const s = scaleOf(no), H = pageH(no);
    const top = b.coord_origin === "TOPLEFT" ? b.t : H - Math.max(b.t, b.b), bot = b.coord_origin === "TOPLEFT" ? b.b : H - Math.min(b.t, b.b);
    return { x0: Math.min(b.l, b.r) * s, x1: Math.max(b.l, b.r) * s, y0: top * s, y1: bot * s };
  };
  const push = (no, it) => { if (!byPage.has(no)) byPage.set(no, []); byPage.get(no).push(it); };
  const visit = (ref, depth = 0, siblings = 0) => {
    if (depth > 20 || !ref?.$ref) return;
    const [, kind, idx] = ref.$ref.split("/"), node = doc[kind]?.[Number(idx)]; if (!node) return;
    if (kind === "groups") { const ch = node.children || []; for (const c of ch) visit(c, depth + 1, ch.length); return; }
    const prov = node.prov?.[0], no = prov?.page_no ?? 1, b = box(prov, no), label = node.label || "";
    if (kind === "pictures") return push(no, { type: "figure", box: b });
    if (kind === "tables") return push(no, { type: "table", box: b });
    if (SKIP.has(label)) return;
    if (CROP.has(label) && b) return push(no, { type: "figure", box: b, formula: true });
    const text = String(node.text ?? node.orig ?? "").replace(/\s+/g, " ").trim(); if (!text) return;
    if (HEADING.has(label)) return push(no, { type: "h", text, level: label === "title" ? 1 : Math.min(3, (node.level ?? 1) + 1), box: b });
    if (label === "list_item") {
      const marker = node.marker ? String(node.marker).trim() : "";
      // 번호가 붙은 한 줄짜리 목록(항목이 하나뿐인 목록 그룹)은 사실 소제목이다: "1. Introduction"
      if (marker && node.enumerated && siblings === 1 && text.length <= 80 && !/[.?!。]$/.test(text)) return push(no, { type: "h", text: `${marker} ${text}`, level: 2, box: b });
      return push(no, { type: "p", text: LIST.test(text) ? text : `${marker || "•"} ${text}`, label, box: b });
    }
    push(no, { type: "p", text, label, box: b });
  };
  for (const c of doc.body?.children || []) visit(c);
  return byPage;                                            // Map<쪽번호(1부터), 항목[]>
}
