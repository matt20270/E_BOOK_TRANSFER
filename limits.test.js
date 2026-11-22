import test from "node:test"; import assert from "node:assert/strict";
import { TXT_MAX_BYTES, PDF_WARN_BYTES, PDF_MAX_BYTES, PDF_MAX_PAGES, MAX_CANVAS_PIXELS, MAX_EPUB_IMAGE_BYTES } from "../js/limits.js";
test("보안 상한값: 모두 유한하고 경고 < 최대 순서", () => {
  assert.equal(PDF_MAX_BYTES, 5 * 1024 ** 3);
  assert.ok(PDF_WARN_BYTES < PDF_MAX_BYTES);
  for (const v of [TXT_MAX_BYTES, PDF_MAX_PAGES, MAX_CANVAS_PIXELS, MAX_EPUB_IMAGE_BYTES]) assert.ok(Number.isFinite(v) && v > 0);
  assert.equal(TXT_MAX_BYTES, 50 * 1024 * 1024);
});
