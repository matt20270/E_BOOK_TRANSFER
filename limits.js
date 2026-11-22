// 보안·메모리 보호용 상한값 (임의로 키우지 마세요)
export const TXT_MAX_BYTES = 50 * 1024 * 1024;               // TXT: 50MB
export const PDF_WARN_BYTES = 50 * 1024 * 1024;              // PDF: 50MB 초과 시 경고 후 허용
export const PDF_MAX_BYTES = 5 * 1024 * 1024 * 1024;         // PDF: 어떤 경우에도 5GB 초과 불가 (필요한 부분만 읽으므로 메모리에 통째로 올리지 않음)
export const PDF_MAX_PAGES = 5000;                           // 쪽수 상한 (한 번에 처리할 범위는 직접 고를 수 있음)
export const MAX_CANVAS_PIXELS = 16 * 1000 * 1000;           // 쪽 한 장을 그릴 때 최대 픽셀 수 (메모리 고갈 방지)
export const MAX_EPUB_IMAGE_BYTES = 1024 * 1024 * 1024;      // EPUB에 넣을 이미지 합계 상한 1GB (브라우저 메모리·EPUB 크기 보호)
