# 큰 모델·엔진 파일 목록 (v0.4.0)

이 파일들은 PDF 변환 엔진(책 모드·논문 모드)에 필요합니다. 파일 하나라도 없으면 변환 시작 때 "인식 엔진을 불러오지 못했습니다"가 나옵니다.
**GitHub 웹 업로드는 파일당 한도(제가 알기로 25MB)가 있어, `layout_heron_int8.onnx`(약 66MB) 같은 큰 파일은 GitHub Desktop으로 올려야 합니다.** (README의 '큰 파일 올리기' 참고)

| 파일 | 용도 | 크기 | 출처 | 라이선스 |
|---|---|---|---|---|
| `vendor/ort/ort-wasm-simd-threaded.wasm` | ONNX Runtime Web 실행 엔진 (WASM) | 14.2MB | onnxruntime-web 1.31.1 (npm) | MIT |
| `vendor/ort/ort-wasm-simd-threaded.mjs` | ONNX Runtime Web 보조 JS | 0.0MB | onnxruntime-web 1.31.1 (npm) | MIT |
| `vendor/ort/ort.wasm.min.mjs` | ONNX Runtime Web JS | 0.1MB | onnxruntime-web 1.31.1 (npm) | MIT |
| `vendor/ppocr/pp-ocrv5_mobile_det.onnx` | 글줄 검출 (PP-OCRv5 mobile det) | 4.6MB | https://github.com/GreatV/oar-ocr/releases/download/v0.3.0/pp-ocrv5_mobile_det.onnx | Apache-2.0 (PaddlePaddle) |
| `vendor/ppocr/korean_pp-ocrv5_mobile_rec.onnx` | 한국어 인식 (PP-OCRv5 korean mobile rec) | 12.8MB | https://github.com/GreatV/oar-ocr/releases/download/v0.3.0/korean_pp-ocrv5_mobile_rec.onnx | Apache-2.0 (PaddlePaddle) |
| `vendor/ppocr/ppocrv5_korean_dict.txt` | 한국어 글자표 | 0.0MB | https://github.com/GreatV/oar-ocr/releases/download/v0.3.0/ppocrv5_korean_dict.txt | Apache-2.0 |
| `vendor/ppocr/ocr_rec_en.onnx` | 영어 인식 (PP-OCR 영어 rec) | 8.6MB | https://github.com/docling-project/docling.rs/releases/download/models-v1/ocr_rec_en.onnx | Apache-2.0 (PaddlePaddle) |
| `vendor/ppocr/en_dict.txt` | 영어 글자표 | 0.0MB | https://github.com/docling-project/docling.rs/releases/download/models-v1/en_dict.txt | Apache-2.0 |
| `vendor/docling/layout_heron_int8.onnx` | Docling 레이아웃 모델 (int8) | 65.5MB | https://github.com/docling-project/docling.rs/releases/download/models-v1/layout_heron_int8.onnx | Apache-2.0 (docling-layout-heron) |
| `vendor/docling/docling_wasm_bg.wasm` | Docling 실행 코드 (Rust→WASM) | 15.2MB | docling.rs-wasm (npm) | MIT |
| `vendor/docling/docling_wasm.js` | Docling JS 연결 코드 | 0.0MB | docling.rs-wasm (npm) | MIT |

외부에서 다시 받을 때는 위 주소의 파일을 받아 같은 이름으로 같은 폴더에 넣으면 됩니다. 외부 통신은 파일을 받을 때만 필요하고, 사이트 실행 중에는 어떤 파일도 밖으로 나가지 않습니다 (`connect-src 'none'`).
