# X4 Pro Reader Studio (웹) — 마스터 인수인계서 (v0.4.0)

> **AI 어시스턴트에게 (필수 지침)**
> 1. 이 프로젝트는 **순수 정적 웹사이트(HTML/CSS/JS, GitHub Pages)** 입니다. Mac 로컬 앱, Python 백엔드, 서버, 로컬 설치형 AI(Ollama 등)는 폐기 — 제안·구현 금지. **단, 브라우저 안(WASM/ONNX)에서 도는 PaddleOCR·Docling은 사용자가 허락했고 v0.4.0에 들어 있음.**
> 2. 사용자는 코딩을 거의 모르고 **터미널/Node를 쓰지 않습니다.** 쉬운 한국어로 설명하고, 코드를 쓰기 전에 꼭 필요한 질문을 먼저 합니다. 사용자가 "필요한 질문을 수 만큼"이라고 했습니다. 변경은 **바뀐 파일만 담은 업데이트 ZIP**으로 드리고, 100MB에 가까운 큰 파일은 **GitHub Desktop**으로 올리게 합니다 (웹 업로드는 파일당 약 25MB·100개 제한).
> 3. **보안 수칙은 모든 단계에서 무조건 지킵니다** (아래 1번).

## 1. 보안 및 안전 수칙
1. 비밀 정보를 코드에 넣지 않고 `.gitignore`를 유지한다.
2. **CSP를 완화하지 않는다.** 현재: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'`. 외부 CDN 금지, 라이브러리·모델은 `vendor/`에 내장. ONNX Runtime·Docling WASM은 **별도 Worker(`js/engine-worker.js`)** 안에서 돌고 `workerBlobURL:false`/`proxy:false`/`numThreads:1`이라 `'wasm-unsafe-eval'` 없이 동작함(실제 CSP로 시험함). 완화가 필요해 보이면 이유를 설명하고 사용자 허락을 먼저 받는다.
3. 사용자 파일에서 나온 글(PDF·OCR·Docling·TXT·메타데이터)은 `innerHTML` 금지, `textContent`/`createTextNode`만. 편집 영역 붙여넣기는 text/plain만, 드롭은 차단. EPUB 출력은 `esc()`/`cleanXmlText()`.
4. 상한 (`js/limits.js`): TXT 50MB. PDF 50MB 초과 시 경고, **최대 5GB(사용자 요청으로 확대)**, 최대 5000쪽, 쪽 한 장 렌더링 1,600만 픽셀, EPUB 이미지 합계 1GB, 논문 모드 글자 PDF 경로 100MB. PDF는 `file.arrayBuffer()`로 통째로 읽지 말고 범위 읽기(`openPdfFile`)를 쓴다(논문 모드 digital 경로만 예외, 100MB 이하). EPUB을 읽는 기능을 추가하면 Zip Slip(`../`) 차단 필수.
5. 다운로드 파일명은 `sanitizeFilename`으로 정제 (책 제목에는 `stripExt=false`).

## 2. 현재 상태 (v0.4.0)
- **완료**: 사이트(남색+금색, 한/영), TXT 정리, PDF → EPUB 3모드:
  - **책 모드(기본)**: PP-OCRv5 검출 + 휘어진 글줄 펴기 + PP-OCRv5 한국어 인식 (`ppocr-core.js`, `engine-worker.js`)
  - **논문 모드**: docling.rs-wasm(레이아웃 모델 heron int8) → 읽기 순서·제목·그림/표/수식 영역. 글자 PDF는 `DigitalConverter`(OCR 없음), 스캔은 `ScannedConverter`+PP-OCR 인식. 그림·표·수식은 쪽 그림에서 잘라 이미지로 EPUB에 넣음. 표 구조 복원(TableFormer 380MB)은 넣지 않음.
  - **빠른 모드**: 기존 Tesseract(+기울기 재시도, 쪽별 재인식)
  - 공통: 쪽별 글/이미지/둘 다/제외, 낮은 신뢰도 노란 표시·직접 편집, 쪽 범위, 5GB 범위 읽기, 메모리 회수(25쪽마다 PDF 재연결, 100쪽마다 엔진 재시작), 표지, 흑백/컬러, 쪽 이미지 480×800 / 960×1600
- **검증함 (Chromium 헤드리스, 실제 CSP)**: 단위 테스트(`node --test tests/*.test.js`), 화면·보안 시험(기존 33개 회귀 + 새 25개), 192쪽 실제 PDF 변환.
- **미검증**: 실제 X4 Pro 기기, Safari/Firefox/휴대폰, EPUB 정식 검사기(epubcheck), 수천 쪽짜리 실제 5GB PDF.
- **미구현 (다음)**: **XTC 출력**(기기 전용 쪽 비트맵 형식, 사용자 요청), 단어 목록 보정(보류), 변경 부분 색상 강조·저장 전 인코딩 경고·문단 연결/분리 버튼(TXT), EPUB→TXT, 설정 백업/복원, Web Worker로 편집 화면 분리.

## 3. 알게 된 사실 (설계 근거 — 같은 시도를 반복하지 말 것)
**기기(X4 Pro 순정)**: 사용자 보고로 EPUB 이미지가 제대로 안 나옴. 제조사 매뉴얼은 EPUB 이미지가 표시되지 않을 수 있다고 함. 이미지가 나오는 커뮤니티 펌웨어도 베이스라인 JPEG/PNG만, 최대 1024×1024 수준. 우리 JPEG는 베이스라인(확인함)이지만 "960×1600" 옵션은 1024 초과. 기기 전용 **XTC/XTCH**(미리 그려 둔 480×800 쪽 비트맵) 형식이 있음 — 명세는 비공식(AI가 쓴 문서 포함), 기기에서 확인 필요. 사용자가 XTC도 함께 개발하기로 결정. 이미지가 구체적으로 어떻게 보였는지(빈 칸/잘림/흐림), 960×1600을 썼는지는 아직 답을 못 받음.

**OCR 비교(사용자 책 「세계의 귀여운 빵」 192쪽 전부 스캔, 사진 위 기울어진 글씨. 정답은 사람이 전사한 12·100·140·2쪽, F1)**
- Tesseract(0° 1회) 0.39~0.59 → 기울기 재시도 평균 +9~18%(해당 쪽 4~5배 느림). 효과 없던 것: 해상도 2400~3200px, `user_defined_dpi`, 대비·반전, float 모델, 글줄별 baseline 보정+psm7(F1 0.1~0.3로 폭락), 2배 렌더+고품질 축소, `kor+eng` 동시 사용, psm 11(쪽마다 들쭉날쭉). `user-words`는 LSTM 엔진에서 동작하지 않는다는 포럼 보고(직접 시험은 안 함).
- **PP-OCRv5 + 글줄 펴기: 12쪽 0.86~0.89, 100쪽 0.97, 140쪽 0.96, 2쪽 0.84(본문만 정답이라 제목·캡션이 감점, 재현율 0.99~1.0).** JS 이식본이 Python과 같은 정확도(실제 CSP 브라우저에서 확인), 쪽당 4~8초.
- 핵심 발견: 검출 모델은 본문 줄을 정확히 분리하는데 기존 도구(RapidOCR)의 후처리(직사각형 상자+점수 필터)가 휘어진 줄을 버렸다. **글줄 덩어리의 중심선을 따라 폈더니** 해결. 처음에는 띠가 글자 윗부분을 잘랐다 → 띠 두께 1.6~2.5배·아래로 0.05~0.25 범위에서 F1이 거의 평평(값은 `BAND = {ratio 1.9, offset 0.1, xpad 0.35}`, `DET = {thresh 0.5, k 1.0}`). 인식 입력은 BGR, 높이 48, 정규화 (x/255-0.5)/0.5, 오른쪽 0 패딩. 검출 입력은 RGB ImageNet 정규화(사실상 영향 작음). CTC 사전 = ["", ...dict, " "].
- 남은 오류: 몇 글자 오인식, **띄어쓰기 부정확**(구두점 뒤는 규칙 보정, 단어 사이는 못 고침), 줄 끝에서 갈라진 단어가 공백으로 이어짐. 단어 목록 보정은 PP-OCR 결과를 본 뒤 필요하면 하기로 보류.
- 줄 상자 높이: 검출 덩어리 두께(`thick`)는 실제 글자 높이의 약 0.4배 → 문단 나누기용 줄 상자는 `±1.25*thick` (처음 0.3배로 해서 줄마다 문단이 됐었다).

**Docling (사용자가 "PaddleOCR 말고 Docling"을 요청해 조사·시험)**
- Python 원본은 브라우저에서 불가(PyTorch 수 GB). 브라우저판은 **docling.rs-wasm**(MIT, docling-project 커뮤니티 Rust 이식판): Rust가 전처리·글줄 분할·CTC·문서 조립, ONNX 실행만 JS 래퍼(`layout.run`, `rec.run`)에 위임. 한국어는 기본 미지원(`en`/`ch`)이지만 **dict 문자열과 rec 세션을 JS에서 넘기므로 한국어 PP-OCRv5 rec를 꽂으면 동작**(시험함).
- **Docling은 OCR 정확도를 올려 주지 않는다.** 레이아웃 모델(DocLayNet 학습)이 사진 위/기울어진 본문을 "그림"으로 분류해 글을 건너뜀: 12쪽 F1 0.08, 100쪽 0.00, 140쪽 0.24, 52쪽 본문 전부 누락. 깨끗한 2쪽만 0.83. 그래서 **책 모드는 Docling을 쓰지 않고, 논문 모드에서만 구조 분석에 쓴다.**
- 논문(합성 2단 PDF)에서는 읽기 순서·그림·표·캡션이 정확. 표는 간이 복원이라 열이 빠짐 → 표는 이미지로 자름. 번호 소제목("1. Introduction")은 JSON에서 `list_item + enumerated + marker`, 그룹 크기 1로 나옴 → `docling-doc.js`가 제목으로 승격. 좌표는 PDF 포인트(왼쪽 아래) → 픽셀(왼쪽 위)로 변환. 글자 PDF 경로는 쪽당 3~4초(OCR 없음), 스캔 경로는 10~30초.
- 모델 출처: `github.com/docling-project/docling.rs/releases/download/models-v1/` (layout_heron_int8 65.5MB, ocr_rec_en 8.6MB, en_dict). 한국어 rec/det는 `GreatV/oar-ocr` v0.3.0 릴리스. 전체 목록은 `vendor/MODELS.md`. 레이아웃 모델은 Apache-2.0(확인함); 변환본(int8 ONNX, en rec)의 개별 라이선스는 따로 확인하지 못함.

**기타**: 사용자 PDF 50.8MB → 5GB까지 범위 읽기. pdf.js 범위 읽기는 읽은 구간을 쌓으므로 25쪽마다 `recyclePdf()`. 머리말 자동 제거는 3쪽 이상일 때만 반복 판단. 실제 책 192쪽 Tesseract 모드: 349초, 최대 1.7GB.

## 4. 다음 단계 후보 (새 채팅 첫 응답에서 사용자에게 질문 후 확정)
- **A. XTC 출력** (사용자 결정 사항): 쪽 이미지 → 480×800 1비트/2비트 그레이 + 글 쪽을 우리가 렌더링(시스템 글꼴, 선택한 글자 크기). 명세 확인(비공식), 기기 확인 필요. 먼저 사용자의 기기 증상(이미지가 어떻게 보였는지)을 물을 것.
- **B. 배포·실기 검증**: GitHub Desktop으로 모델 포함 배포 → X4 Pro에서 EPUB/XTC 확인, Safari/휴대폰 확인.
- **C. 책 모드 품질**: 띄어쓰기 보정(사전/규칙), 줄 끝 갈라진 단어, 단어 목록 보정, 2단 책, 영어 위주 쪽 모델 선택 자동화.
- **D. TXT 편집기 완성**, EPUB 점검기.

## 5. 파일 구조
`index.html`, `css/style.css`, `js/{app,convert,layout,epub,pdf,ocr,engine,engine-worker,ppocr-core,docling-doc,txt,i18n,limits}.js`, `tests/*.test.js`(+`tests/fixtures/docling-*.json` 실제 docling.rs 출력), `vendor/{pdfjs,tesseract,jszip,ort,ppocr,docling}`(+`NOTICE.md`, `MODELS.md`), `README.md`, `.gitignore`, `.nojekyll`. 소스의 기준은 저장소/ZIP입니다.
