export type Locale = "ko" | "en";

export const DEFAULT_LOCALE: Locale = "ko";

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};

export const CONVERTER_TEXT = {
  ko: {
    invalidImage: "이미지 파일만 지원됩니다.",
    genericError: "변환 중 오류가 발생했습니다.",
    uploadPrompt: "이미지를 드래그하거나 클릭하여 업로드",
    uploadFormats: "PNG, JPG, WebP, GIF, BMP, AVIF 지원",
    trustAfterDone: "안심하세요. 파일은 브라우저 안에서만 처리되며 서버로 업로드되지 않습니다.",
    download: "다운로드",
    chooseAnother: "다른 파일",
    chooseFormat: "포맷을 선택하세요",
    convertSuffix: "변환",
    removeFile: "파일 제거",
    selectTargetFormat: "변환할 포맷을 선택하세요",
    statusLoading: "파일 로딩 중...",
    statusConverting: "변환 중...",
    statusDone: "✨ 변환 완료!",
    statusError: "❌ 변환 실패",
    formatTips: {
      png: "팁: 투명 배경 유지가 필요하면 PNG, 용량을 줄이려면 WebP를 선택하세요.",
      jpg: "팁: 사진 선명도 우선이면 JPG, 더 작은 파일이 필요하면 WebP를 선택하세요.",
      jpeg: "팁: 사진 선명도 우선이면 JPG, 더 작은 파일이 필요하면 WebP를 선택하세요.",
      gif: "팁: GIF를 정지 이미지로 바꿀 때는 PNG, 웹 업로드 용량 최적화는 WebP가 유리합니다.",
      ico: "팁: 웹 사이트 파비콘으로 쓸 파일이면 ICO를 유지하고, 일반 이미지 용도면 PNG를 권장합니다.",
      default: "팁: 투명 배경은 PNG, 웹 업로드 용량 최적화는 WebP, 파비콘 제작은 ICO를 권장합니다.",
    },
  },
  en: {
    invalidImage: "Only image files are supported.",
    genericError: "An error occurred during conversion.",
    uploadPrompt: "Drag or click to upload an image",
    uploadFormats: "Supports PNG, JPG, WebP, GIF, BMP, and AVIF",
    trustAfterDone: "Your file stays in this browser and is never uploaded to a server.",
    download: "Download",
    chooseAnother: "Another file",
    chooseFormat: "Select a format",
    convertSuffix: "Convert",
    removeFile: "Remove file",
    selectTargetFormat: "Choose the target format",
    statusLoading: "Loading file...",
    statusConverting: "Converting...",
    statusDone: "✨ Conversion complete!",
    statusError: "❌ Conversion failed",
    formatTips: {
      png: "Tip: Keep transparency with PNG, or choose WebP for smaller files.",
      jpg: "Tip: Use JPG for photo clarity, or WebP for better compression.",
      jpeg: "Tip: Use JPG for photo clarity, or WebP for better compression.",
      gif: "Tip: For still images from GIF, use PNG. For web optimization, choose WebP.",
      ico: "Tip: Keep ICO for favicons. Use PNG for general image usage.",
      default: "Tip: PNG keeps transparency, WebP optimizes web size, and ICO is best for favicons.",
    },
  },
} as const;

export const HOME_TEXT = {
  ko: {
    badge: "100% 무료 · 서버 업로드 없음",
    heroTitleLine1: "업로드 한 번으로,",
    heroTitleLine2: "원하는 포맷으로 바로 변환",
    heroTrailing: "회원가입 없이 브라우저에서 바로 변환하세요.",
    primaryCta: "파일 업로드하고 변환",
    converterWhy: "왜 Extension Converter인가요?",
    faqHeading: "자주 묻는 질문",
    footer: "© 2025 ExtensionConverter. All conversions happen in your browser.",
    features: [
      { title: "100% 무료", desc: "제한 없이 원하는 만큼 변환하세요. 회원가입도 필요 없습니다." },
      { title: "초고속 변환", desc: "브라우저에서 바로 처리되어 대기 시간이 없습니다." },
      { title: "완벽한 프라이버시", desc: "파일이 서버에 업로드되지 않습니다. 모든 변환은 당신의 브라우저 안에서." },
    ],
    faq: [
      { question: "정말 무료인가요?", answer: "네. 회원가입 없이 무료로 사용할 수 있으며 변환 횟수 제한도 없습니다." },
      { question: "파일이 서버로 업로드되나요?", answer: "아니요. 변환은 브라우저 안에서 처리되며 파일은 외부 서버로 전송되지 않습니다." },
      { question: "어떤 포맷을 지원하나요?", answer: "주요 이미지 포맷 간 변환을 지원합니다." },
    ],
    themeLight: "라이트",
    themeDark: "다크",
    langLabel: "언어",
    themeLabel: "테마",
  },
  en: {
    badge: "100% free · no server upload",
    heroTitleLine1: "One upload,",
    heroTitleLine2: "instant conversion to your format",
    heroTrailing: "Convert directly in your browser with no sign-up.",
    primaryCta: "Upload and convert",
    converterWhy: "Why Extension Converter?",
    faqHeading: "Frequently asked questions",
    footer: "© 2025 ExtensionConverter. All conversions happen in your browser.",
    features: [
      { title: "100% free", desc: "Convert as much as you want with no sign-up." },
      { title: "Fast conversion", desc: "Everything runs in your browser, so there is no wait queue." },
      { title: "Privacy first", desc: "Your files are not uploaded to a server. Conversion stays local." },
    ],
    faq: [
      { question: "Is it really free?", answer: "Yes. It is free without sign-up, and there is no conversion cap." },
      { question: "Are files uploaded to a server?", answer: "No. Conversion runs in your browser and files are not sent out." },
      { question: "Which formats are supported?", answer: "It supports conversion between major image formats." },
    ],
    themeLight: "Light",
    themeDark: "Dark",
    langLabel: "Language",
    themeLabel: "Theme",
  },
} as const;

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "en" ? "en" : DEFAULT_LOCALE;
}
