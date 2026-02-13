export const SUPPORTED_LOCALES = ["ko", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export interface HomeMessages {
  badge: string;
  heroPrefix: string;
  heroHighlight: string;
  heroSupportCopy: (formatList: string, formatCount: number) => string;
  heroSubCopy: string;
  primaryCtaLabel: string;
  featuresHeading: string;
  features: {
    freeTitle: string;
    freeDesc: string;
    fastTitle: string;
    fastDesc: string;
    privacyTitle: string;
    privacyDesc: string;
    formatTitle: (formatCount: number) => string;
    formatDesc: (formatList: string) => string;
  };
  faqHeading: string;
  faq: {
    freeQuestion: string;
    freeAnswer: string;
    uploadQuestion: string;
    uploadAnswer: string;
    formatQuestion: string;
    formatAnswer: (formatList: string) => string;
  };
  footer: string;
  languageLabel: string;
  languageKo: string;
  languageEn: string;
}

export interface SeoMessages {
  title: string;
  description: string;
  keywords: string[];
  openGraphLocale: string;
  openGraphAlternateLocale: string;
}

export interface ConverterMessages {
  invalidImage: string;
  unknownConversionError: string;
  dropzoneTitle: string;
  dropzoneFormats: string;
  formatSelectorLabel: string;
  formatTipDefault: string;
  formatTipBySource: Partial<Record<string, string>>;
  statusLoading: string;
  statusConverting: string;
  statusDone: string;
  statusError: string;
  trustMessage: string;
  downloadLabel: (filename: string) => string;
  chooseFormatLabel: string;
  convertLabel: (source: string, target: string) => string;
  chooseAnotherFile: string;
  removeFileAriaLabel: string;
}

export const HOME_MESSAGES: Record<Locale, HomeMessages> = {
  ko: {
    badge: "100% 무료 · 서버 업로드 없음",
    heroPrefix: "업로드 한 번으로,",
    heroHighlight: "원하는 포맷으로 바로 변환",
    heroSupportCopy: (formatList, formatCount) =>
      `${formatList} 지원 포맷 ${formatCount}종을 브라우저에서 바로 변환할 수 있어요.`,
    heroSubCopy: "회원가입 없이 브라우저에서 바로 변환하세요.",
    primaryCtaLabel: "파일 업로드하고 변환",
    featuresHeading: "왜 Extension Converter인가요?",
    features: {
      freeTitle: "100% 무료",
      freeDesc: "제한 없이 원하는 만큼 변환하세요. 회원가입도 필요 없습니다.",
      fastTitle: "초고속 변환",
      fastDesc: "브라우저에서 바로 처리되어 대기 시간이 없습니다.",
      privacyTitle: "완벽한 프라이버시",
      privacyDesc: "파일이 서버에 업로드되지 않습니다. 모든 변환은 당신의 브라우저 안에서.",
      formatTitle: (formatCount) => `${formatCount}가지 포맷`,
      formatDesc: (formatList) => `${formatList} 간 자유로운 변환.`,
    },
    faqHeading: "자주 묻는 질문",
    faq: {
      freeQuestion: "정말 무료인가요?",
      freeAnswer: "네. 회원가입 없이 무료로 사용할 수 있으며 변환 횟수 제한도 없습니다.",
      uploadQuestion: "파일이 서버로 업로드되나요?",
      uploadAnswer: "아니요. 변환은 브라우저 안에서 처리되며 파일은 외부 서버로 전송되지 않습니다.",
      formatQuestion: "어떤 포맷을 지원하나요?",
      formatAnswer: (formatList) => `${formatList} 등 주요 이미지 포맷 간 변환을 지원합니다.`,
    },
    footer: "© 2025 ExtensionConverter. 모든 변환은 브라우저 안에서 처리됩니다.",
    languageLabel: "언어",
    languageKo: "한국어",
    languageEn: "영어",
  },
  en: {
    badge: "100% free · no server uploads",
    heroPrefix: "One upload,",
    heroHighlight: "instant conversion to your target format",
    heroSupportCopy: (formatList, formatCount) =>
      `Convert across ${formatCount} supported formats (${formatList}) right in your browser.`,
    heroSubCopy: "No sign-up required. Convert directly in your browser.",
    primaryCtaLabel: "Upload and convert",
    featuresHeading: "Why Extension Converter?",
    features: {
      freeTitle: "100% free",
      freeDesc: "Convert as much as you want with no signup and no limits.",
      fastTitle: "Ultra-fast conversion",
      fastDesc: "Everything runs in your browser, so there is no upload wait.",
      privacyTitle: "Strong privacy",
      privacyDesc: "Your files never leave your device. All conversion stays local.",
      formatTitle: (formatCount) => `${formatCount} formats`,
      formatDesc: (formatList) => `Freely convert between ${formatList}.`,
    },
    faqHeading: "Frequently asked questions",
    faq: {
      freeQuestion: "Is it really free?",
      freeAnswer: "Yes. It is free without signup, and there is no conversion cap.",
      uploadQuestion: "Are files uploaded to a server?",
      uploadAnswer: "No. Conversion is handled in-browser and files are not sent externally.",
      formatQuestion: "Which formats are supported?",
      formatAnswer: (formatList) =>
        `We support conversion across major image formats including ${formatList}.`,
    },
    footer: "© 2025 ExtensionConverter. All conversions happen in your browser.",
    languageLabel: "Language",
    languageKo: "Korean",
    languageEn: "English",
  },
};

export const CONVERTER_MESSAGES: Record<Locale, ConverterMessages> = {
  ko: {
    invalidImage: "이미지 파일만 지원됩니다.",
    unknownConversionError: "변환 중 오류가 발생했습니다.",
    dropzoneTitle: "이미지를 드래그하거나 클릭하여 업로드",
    dropzoneFormats: "PNG, JPG, WebP, GIF, BMP, AVIF 지원",
    formatSelectorLabel: "변환할 포맷을 선택하세요",
    formatTipDefault:
      "팁: 투명 배경은 PNG, 웹 업로드 용량 최적화는 WebP, 파비콘 제작은 ICO를 권장합니다.",
    formatTipBySource: {
      png: "팁: 투명 배경 유지가 필요하면 PNG, 용량을 줄이려면 WebP를 선택하세요.",
      jpg: "팁: 사진 선명도 우선이면 JPG, 더 작은 파일이 필요하면 WebP를 선택하세요.",
      jpeg: "팁: 사진 선명도 우선이면 JPG, 더 작은 파일이 필요하면 WebP를 선택하세요.",
      gif: "팁: GIF를 정지 이미지로 바꿀 때는 PNG, 웹 업로드 용량 최적화는 WebP가 유리합니다.",
      ico: "팁: 웹 사이트 파비콘으로 쓸 파일이면 ICO를 유지하고, 일반 이미지 용도면 PNG를 권장합니다.",
    },
    statusLoading: "파일 로딩 중...",
    statusConverting: "변환 중...",
    statusDone: "✨ 변환 완료!",
    statusError: "❌ 변환 실패",
    trustMessage: "안심하세요. 파일은 브라우저 안에서만 처리되며 서버로 업로드되지 않습니다.",
    downloadLabel: (filename) => `다운로드 (${filename})`,
    chooseFormatLabel: "포맷을 선택하세요",
    convertLabel: (source, target) => `${source.toUpperCase()} → ${target.toUpperCase()} 변환`,
    chooseAnotherFile: "다른 파일",
    removeFileAriaLabel: "파일 제거",
  },
  en: {
    invalidImage: "Only image files are supported.",
    unknownConversionError: "An error occurred during conversion.",
    dropzoneTitle: "Drag an image here or click to upload",
    dropzoneFormats: "Supports PNG, JPG, WebP, GIF, BMP, and AVIF",
    formatSelectorLabel: "Choose a target format",
    formatTipDefault:
      "Tip: Use PNG for transparency, WebP for smaller web uploads, and ICO for favicons.",
    formatTipBySource: {
      png: "Tip: Keep PNG for transparency, or choose WebP for smaller files.",
      jpg: "Tip: Keep JPG for photo fidelity, or choose WebP for a smaller file size.",
      jpeg: "Tip: Keep JPG for photo fidelity, or choose WebP for a smaller file size.",
      gif: "Tip: Convert GIF to PNG for a still image, or choose WebP for web size optimization.",
      ico: "Tip: Keep ICO for website favicons, or use PNG for general image workflows.",
    },
    statusLoading: "Loading file...",
    statusConverting: "Converting...",
    statusDone: "✨ Conversion complete!",
    statusError: "❌ Conversion failed",
    trustMessage: "Your file is processed only in your browser and is never uploaded to a server.",
    downloadLabel: (filename) => `Download (${filename})`,
    chooseFormatLabel: "Choose a format",
    convertLabel: (source, target) => `Convert ${source.toUpperCase()} → ${target.toUpperCase()}`,
    chooseAnotherFile: "Another file",
    removeFileAriaLabel: "Remove file",
  },
};

export const SEO_MESSAGES: Record<Locale, SeoMessages> = {
  ko: {
    title: "ExtensionConverter — 무료 이미지 포맷 변환기",
    description:
      "PNG, JPG, WebP, GIF, BMP, AVIF, ICO를 3초만에 변환하세요. 100% 무료, 서버 업로드 없이 브라우저에서 바로 변환됩니다.",
    keywords: [
      "이미지 변환",
      "파일 변환",
      "PNG to JPG",
      "WebP 변환",
      "무료 변환기",
      "image converter",
      "extension converter",
    ],
    openGraphLocale: "ko_KR",
    openGraphAlternateLocale: "en_US",
  },
  en: {
    title: "ExtensionConverter — Free image format converter",
    description:
      "Convert PNG, JPG, WebP, GIF, BMP, AVIF, and ICO in seconds. 100% free and fully in-browser with no server uploads.",
    keywords: [
      "image converter",
      "file converter",
      "PNG to JPG",
      "WebP converter",
      "free converter",
      "extension converter",
      "in-browser conversion",
    ],
    openGraphLocale: "en_US",
    openGraphAlternateLocale: "ko_KR",
  },
};
