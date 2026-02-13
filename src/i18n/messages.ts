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
