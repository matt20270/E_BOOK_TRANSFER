# 내장 라이브러리 (vendor/)
| 이름 | 버전 | 라이선스 | 용도 |
|---|---|---|---|
| pdf.js (pdfjs-dist, legacy build) | 6.5.438 | Apache-2.0 | PDF 읽기·쪽 그리기 (cmaps는 한국어 관련만 포함) |
| Tesseract.js | 7.0.0 | Apache-2.0 | 브라우저 OCR |
| tesseract.js-core | 7.0.0 | Apache-2.0 | OCR 엔진(WebAssembly), LSTM 3종 |
| @tesseract.js-data/kor, eng (4.0.0_best_int) | 1.0.0 | Apache-2.0 | 한국어·영어 인식 데이터 |
| JSZip | 3.10.2 | MIT (MIT OR GPL-3.0 중 MIT 선택) | EPUB(ZIP) 생성 |
외부 CDN을 사용하지 않으며, 업데이트할 때는 npm에서 받은 파일을 이 폴더에 직접 교체하세요.

## v0.4.0에서 추가
| 이름 | 버전 | 라이선스 | 용도 |
|---|---|---|---|
| onnxruntime-web | 1.31.1 | MIT | 브라우저에서 ONNX 모델 실행 (WASM, 단일 스레드) |
| PP-OCRv5 mobile det / korean rec, PP-OCR en rec | - | Apache-2.0 | 책 모드·논문 모드의 글줄 검출·한국어/영어 인식 |
| docling.rs-wasm | 2.86.14 | MIT | 논문 모드 구조 분석 (Docling의 Rust/WASM 이식판) |
| docling-layout-heron (int8 ONNX) | - | Apache-2.0 | 문서 레이아웃 검출 |
자세한 파일 목록과 출처는 `vendor/MODELS.md`를 보세요.
