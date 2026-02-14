import { type Locale as BaseLocale } from "./constants";

export type Locale = BaseLocale;

export interface AppMessages {
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    openGraphLocale: string;
    openGraphDescription: string;
  };
  page: {
    badge: string;
    hero: {
      titleLead: string;
      titleHighlight: string;
      supportCopyTemplate: string;
      signupSuffix: string;
      primaryCta: string;
    };
    whyHeading: string;
    faqHeading: string;
    footer: string;
  };
  features: {
    free: { title: string; desc: string };
    speed: { title: string; desc: string };
    privacy: { title: string; desc: string };
    formats: {
      titleTemplate: string;
      descTemplate: string;
    };
  };
  faq: Array<{
    question: string;
    answerTemplate?: string;
    answer?: string;
  }>;
  converter: {
    invalidImageError: string;
    unknownError: string;
    dropzoneTitle: string;
    dropzoneSupportedTemplate: string;
    formatSelectorLabel: string;
    trustProof: string;
    downloadButtonTemplate: string;
    otherFileButton: string;
    selectFormatButton: string;
    convertButtonTemplate: string;
    removeFileAriaLabel: string;
    progress: {
      loading: string;
      converting: string;
      done: string;
      error: string;
    };
  };
}

const KO_MESSAGES: AppMessages = {
  metadata: {
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
    openGraphDescription: "PNG, JPG, WebP, GIF, BMP, AVIF, ICO를 3초만에 변환하세요.",
  },
  page: {
    badge: "100% 무료 · 서버 업로드 없음",
    hero: {
      titleLead: "업로드 한 번으로,",
      titleHighlight: "원하는 포맷으로 바로 변환",
      supportCopyTemplate: "{formats} 지원 포맷 {count}종을 브라우저에서 바로 변환할 수 있어요.",
      signupSuffix: "회원가입 없이 브라우저에서 바로 변환하세요.",
      primaryCta: "파일 업로드하고 변환",
    },
    whyHeading: "왜 Extension Converter인가요?",
    faqHeading: "자주 묻는 질문",
    footer: "© 2025 ExtensionConverter. All conversions happen in your browser.",
  },
  features: {
    free: {
      title: "100% 무료",
      desc: "제한 없이 원하는 만큼 변환하세요. 회원가입도 필요 없습니다.",
    },
    speed: {
      title: "초고속 변환",
      desc: "브라우저에서 바로 처리되어 대기 시간이 없습니다.",
    },
    privacy: {
      title: "완벽한 프라이버시",
      desc: "파일이 서버에 업로드되지 않습니다. 모든 변환은 당신의 브라우저 안에서.",
    },
    formats: {
      titleTemplate: "{count}가지 포맷",
      descTemplate: "{formats} 간 자유로운 변환.",
    },
  },
  faq: [
    {
      question: "정말 무료인가요?",
      answer: "네. 회원가입 없이 무료로 사용할 수 있으며 변환 횟수 제한도 없습니다.",
    },
    {
      question: "파일이 서버로 업로드되나요?",
      answer: "아니요. 변환은 브라우저 안에서 처리되며 파일은 외부 서버로 전송되지 않습니다.",
    },
    {
      question: "어떤 포맷을 지원하나요?",
      answerTemplate: "{formats} 등 주요 이미지 포맷 간 변환을 지원합니다.",
    },
  ],
  converter: {
    invalidImageError: "이미지 파일만 지원됩니다.",
    unknownError: "변환 중 오류가 발생했습니다.",
    dropzoneTitle: "이미지를 드래그하거나 클릭하여 업로드",
    dropzoneSupportedTemplate: "{formats} 지원",
    formatSelectorLabel: "변환할 포맷을 선택하세요",
    trustProof: "안심하세요. 파일은 브라우저 안에서만 처리되며 서버로 업로드되지 않습니다.",
    downloadButtonTemplate: "다운로드 ({filename})",
    otherFileButton: "다른 파일",
    selectFormatButton: "포맷을 선택하세요",
    convertButtonTemplate: "{source} → {target} 변환",
    removeFileAriaLabel: "파일 제거",
    progress: {
      loading: "파일 로딩 중...",
      converting: "변환 중...",
      done: "✨ 변환 완료!",
      error: "❌ 변환 실패",
    },
  },
};

const EN_MESSAGES: AppMessages = {
  metadata: {
    title: "ExtensionConverter — Free Image Format Converter",
    description:
      "Convert PNG, JPG, WebP, GIF, BMP, AVIF, and ICO in seconds. 100% free with no uploads, all in your browser.",
    keywords: [
      "image converter",
      "file converter",
      "PNG to JPG",
      "WebP converter",
      "free converter",
      "extension converter",
    ],
    openGraphLocale: "en_US",
    openGraphDescription:
      "Convert PNG, JPG, WebP, GIF, BMP, AVIF, and ICO instantly in your browser.",
  },
  page: {
    badge: "100% free · no server uploads",
    hero: {
      titleLead: "Upload once,",
      titleHighlight: "convert to any format instantly",
      supportCopyTemplate: "Convert {count} supported formats like {formats} directly in your browser.",
      signupSuffix: "No signup required.",
      primaryCta: "Upload and convert",
    },
    whyHeading: "Why Extension Converter?",
    faqHeading: "Frequently asked questions",
    footer: "© 2025 ExtensionConverter. All conversions happen in your browser.",
  },
  features: {
    free: {
      title: "100% Free",
      desc: "Convert as much as you want without limits. No account needed.",
    },
    speed: {
      title: "Lightning fast",
      desc: "Everything runs locally in your browser with no waiting.",
    },
    privacy: {
      title: "Private by default",
      desc: "Your files are never uploaded. Every conversion stays in your browser.",
    },
    formats: {
      titleTemplate: "{count} formats",
      descTemplate: "Convert freely between {formats}.",
    },
  },
  faq: [
    {
      question: "Is it really free?",
      answer: "Yes. You can use it for free with no signup and no conversion limits.",
    },
    {
      question: "Are files uploaded to a server?",
      answer: "No. Conversion is processed in your browser and files are not sent externally.",
    },
    {
      question: "Which formats are supported?",
      answerTemplate: "It supports major image conversions including {formats}.",
    },
  ],
  converter: {
    invalidImageError: "Only image files are supported.",
    unknownError: "An error occurred during conversion.",
    dropzoneTitle: "Drag an image here or click to upload",
    dropzoneSupportedTemplate: "Supports {formats}",
    formatSelectorLabel: "Choose an output format",
    trustProof: "Your file stays in your browser and is never uploaded to a server.",
    downloadButtonTemplate: "Download ({filename})",
    otherFileButton: "Another file",
    selectFormatButton: "Choose a format",
    convertButtonTemplate: "Convert {source} → {target}",
    removeFileAriaLabel: "Remove file",
    progress: {
      loading: "Loading file...",
      converting: "Converting...",
      done: "✨ Conversion complete!",
      error: "❌ Conversion failed",
    },
  },
};

const MESSAGES: Record<Locale, AppMessages> = {
  ko: KO_MESSAGES,
  en: EN_MESSAGES,
};

export function getMessages(locale: Locale): AppMessages {
  return MESSAGES[locale] ?? MESSAGES.ko;
}

export function formatMessage(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? "" : String(value);
  });
}

export interface SeoMessages {
  title: string;
  description: string;
  keywords: string[];
  openGraphLocale: string;
  openGraphAlternateLocale: string;
}

export interface HomeMessages {
  badge: string;
  languageLabel: string;
  languageKo: string;
  languageEn: string;
  themeLabel: string;
  lightModeLabel: string;
  darkModeLabel: string;
  heroPrefix: string;
  heroHighlight: string;
  heroSupportCopy: (formats: string, count: number) => string;
  heroSubCopy: string;
  primaryCtaLabel: string;
  featuresHeading: string;
  faqHeading: string;
  footer: string;
  features: {
    freeTitle: string;
    freeDesc: string;
    fastTitle: string;
    fastDesc: string;
    privacyTitle: string;
    privacyDesc: string;
    formatTitle: (count: number) => string;
    formatDesc: (formats: string) => string;
  };
  faq: {
    freeQuestion: string;
    freeAnswer: string;
    uploadQuestion: string;
    uploadAnswer: string;
    formatQuestion: string;
    formatAnswer: (formats: string) => string;
  };
}

export interface ConverterMessages {
  invalidImage: string;
  unknownConversionError: string;
  dropzoneTitle: string;
  dropzoneFormats: string;
  removeFileAriaLabel: string;
  formatSelectorLabel: string;
  formatTipDefault: string;
  formatTipBySource: Record<string, string>;
  formatGuidanceHeadingDefault: string;
  formatGuidanceHeadingBySource: Record<string, string>;
  formatGuidanceQuickPickLabel: string;
  processingTrustMessage: string;
  conversionFailedHeading: string;
  failureGuides: Record<string, string>;
  errorUploadSafetyMessage: string;
  recoveryFormatsHeading: string;
  recoveryRecommendedFormat: (format: string) => string;
  trustMessage: string;
  downloadLabel: (filename: string) => string;
  chooseAnotherFile: string;
  chooseFormatLabel: string;
  retrySameSettingsLabel: string;
  convertLabel: (source: string, target: string) => string;
  statusLoading: string;
  statusConverting: string;
  statusDone: string;
  statusError: string;
  postConversionAdBadge: string;
  postConversionAdTitle: string;
  postConversionAdDescription: string;
  postConversionAdCtaLabel: string;
  postConversionAdHref: string;
}

export const SEO_MESSAGES: Record<Locale, SeoMessages> = {
  ko: {
    title: KO_MESSAGES.metadata.title,
    description: KO_MESSAGES.metadata.description,
    keywords: KO_MESSAGES.metadata.keywords,
    openGraphLocale: KO_MESSAGES.metadata.openGraphLocale,
    openGraphAlternateLocale: EN_MESSAGES.metadata.openGraphLocale,
  },
  en: {
    title: "ExtensionConverter — Free image format converter",
    description: EN_MESSAGES.metadata.description,
    keywords: EN_MESSAGES.metadata.keywords,
    openGraphLocale: EN_MESSAGES.metadata.openGraphLocale,
    openGraphAlternateLocale: KO_MESSAGES.metadata.openGraphLocale,
  },
};

export const HOME_MESSAGES: Record<Locale, HomeMessages> = {
  ko: {
    badge: KO_MESSAGES.page.badge,
    languageLabel: "언어",
    languageKo: "한국어",
    languageEn: "English",
    themeLabel: "테마",
    lightModeLabel: "라이트",
    darkModeLabel: "다크",
    heroPrefix: "업로드 한 번으로,",
    heroHighlight: "원하는 포맷으로 바로 변환",
    heroSupportCopy: (formats, count) =>
      formatMessage(KO_MESSAGES.page.hero.supportCopyTemplate, { formats, count }),
    heroSubCopy: "회원가입 없이 브라우저에서 바로 변환하세요.",
    primaryCtaLabel: "파일 업로드하고 변환",
    featuresHeading: "왜 Extension Converter인가요?",
    faqHeading: KO_MESSAGES.page.faqHeading,
    footer: KO_MESSAGES.page.footer,
    features: {
      freeTitle: "100% 무료",
      freeDesc: KO_MESSAGES.features.free.desc,
      fastTitle: "초고속 변환",
      fastDesc: KO_MESSAGES.features.speed.desc,
      privacyTitle: "완벽한 프라이버시",
      privacyDesc: KO_MESSAGES.features.privacy.desc,
      formatTitle: (count) =>
        formatMessage(KO_MESSAGES.features.formats.titleTemplate, { count }),
      formatDesc: (formats) =>
        formatMessage(KO_MESSAGES.features.formats.descTemplate, { formats }),
    },
    faq: {
      freeQuestion: "정말 무료인가요?",
      freeAnswer:
        "네. 회원가입 없이 무료로 사용할 수 있으며 변환 횟수 제한도 없습니다.",
      uploadQuestion: "파일이 서버로 업로드되나요?",
      uploadAnswer:
        "아니요. 변환은 브라우저 안에서 처리되며 파일은 외부 서버로 전송되지 않습니다.",
      formatQuestion: "어떤 포맷을 지원하나요?",
      formatAnswer: (formats) => `${formats} 등 주요 이미지 포맷 간 변환을 지원합니다.`,
    },
  },
  en: {
    badge: "100% free · no server uploads",
    languageLabel: "Language",
    languageKo: "한국어",
    languageEn: "English",
    themeLabel: "Theme",
    lightModeLabel: "Light",
    darkModeLabel: "Dark",
    heroPrefix: "One upload,",
    heroHighlight: "instant conversion to your target format",
    heroSupportCopy: (formats, count) =>
      `Convert ${count} supported formats like ${formats} directly in your browser.`,
    heroSubCopy: "No signup required.",
    primaryCtaLabel: "Upload and convert",
    featuresHeading: "Why Extension Converter?",
    faqHeading: "Frequently asked questions",
    footer: EN_MESSAGES.page.footer,
    features: {
      freeTitle: "100% free",
      freeDesc: EN_MESSAGES.features.free.desc,
      fastTitle: "Lightning fast",
      fastDesc: EN_MESSAGES.features.speed.desc,
      privacyTitle: "Private by default",
      privacyDesc: EN_MESSAGES.features.privacy.desc,
      formatTitle: (count) => `${count} formats`,
      formatDesc: (formats) => `Convert freely between ${formats}.`,
    },
    faq: {
      freeQuestion: "Is it really free?",
      freeAnswer: "Yes. You can use it for free with no signup and no conversion limits.",
      uploadQuestion: "Are files uploaded to a server?",
      uploadAnswer:
        "No. Conversion is processed in your browser and files are not sent externally.",
      formatQuestion: "Which formats are supported?",
      formatAnswer: (formats) =>
        `It supports major image conversions including ${formats}.`,
    },
  },
};

export const CONVERTER_MESSAGES: Record<Locale, ConverterMessages> = {
  ko: {
    invalidImage: "이미지 파일만 지원됩니다.",
    unknownConversionError: "변환 중 오류가 발생했습니다.",
    dropzoneTitle: "이미지를 드래그하거나 클릭하여 업로드",
    dropzoneFormats: "PNG, JPG, WEBP, GIF, BMP, AVIF, ICO 지원",
    removeFileAriaLabel: "파일 제거",
    formatSelectorLabel: "변환할 포맷을 선택하세요",
    formatTipDefault: "PNG, WEBP를 먼저 시도하면 높은 성공률을 얻을 수 있어요.",
    formatTipBySource: {
      png: "PNG는 WEBP로 변환하면 용량을 줄이기 쉽습니다.",
      jpg: "JPG는 WEBP 변환 시 화질 대비 용량 효율이 좋습니다.",
      jpeg: "JPEG는 WEBP 변환 시 화질 대비 용량 효율이 좋습니다.",
      gif: "GIF는 PNG 또는 WEBP로 바꾸면 편집과 공유가 더 쉬워집니다.",
      ico: "ICO는 PNG로 변환하면 다양한 환경에서 활용하기 쉽습니다.",
    },
    formatGuidanceHeadingDefault: "추천 출력 포맷",
    formatGuidanceHeadingBySource: {
      png: "PNG 파일을 올렸어요",
      jpg: "JPG 파일을 올렸어요",
      jpeg: "JPG 파일을 올렸어요",
      gif: "GIF 파일을 올렸어요",
      ico: "ICO 파일을 올렸어요",
    },
    formatGuidanceQuickPickLabel: "빠른 선택",
    processingTrustMessage:
      "파일은 브라우저 안에서만 처리되며 서버로 업로드되지 않습니다.",
    conversionFailedHeading: "변환에 실패했어요.",
    failureGuides: {
      unsupported_target_format: "선택한 출력 포맷을 현재 브라우저에서 지원하지 않을 수 있습니다.",
      canvas_context_unavailable: "브라우저 캔버스 초기화에 실패했습니다. 탭을 새로고침하고 다시 시도해 주세요.",
      memory_limit_exceeded: "메모리 제한에 도달했습니다. 더 작은 파일이나 다른 포맷으로 시도해 주세요.",
      image_decode_failed: "파일 디코딩에 실패했습니다. 원본 파일이 손상되지 않았는지 확인해 주세요.",
      conversion_aborted: "변환이 중단되었습니다. 같은 설정으로 다시 시도해 주세요.",
      conversion_runtime_error: "일시적 오류가 발생했습니다. 다른 포맷으로 시도하면 성공률이 올라갑니다.",
      unknown: "일시적 오류가 발생했습니다. 다른 포맷 또는 더 작은 파일로 다시 시도해 주세요.",
    },
    errorUploadSafetyMessage: "파일은 서버로 업로드되지 않았습니다.",
    recoveryFormatsHeading: "다른 포맷으로 시도",
    recoveryRecommendedFormat: (format) => `추천 포맷: ${format.toUpperCase()}`,
    trustMessage:
      "안심하세요. 파일은 브라우저 안에서만 처리되며 서버로 업로드되지 않습니다.",
    downloadLabel: (filename) => `다운로드 (${filename})`,
    chooseAnotherFile: "다른 파일",
    chooseFormatLabel: "포맷을 선택하세요",
    retrySameSettingsLabel: "같은 설정으로 다시 시도",
    convertLabel: (source, target) =>
      `${source.toUpperCase()} → ${target.toUpperCase()} 변환`,
    statusLoading: "파일 로딩 중...",
    statusConverting: "변환 중...",
    statusDone: "✨ 변환 완료!",
    statusError: "❌ 변환 실패",
    postConversionAdBadge: "추천",
    postConversionAdTitle: "다음 작업도 빠르게 이어가세요",
    postConversionAdDescription: "변환이 끝났습니다. 관련 도구를 확인해 보세요.",
    postConversionAdCtaLabel: "도구 보기",
    postConversionAdHref: "https://example.com",
  },
  en: {
    invalidImage: "Only image files are supported.",
    unknownConversionError: "An error occurred during conversion.",
    dropzoneTitle: "Drag an image here or click to upload",
    dropzoneFormats: "Supports PNG, JPG, WEBP, GIF, BMP, AVIF, ICO",
    removeFileAriaLabel: "Remove file",
    formatSelectorLabel: "Choose an output format",
    formatTipDefault: "Start with PNG or WEBP for the highest success rate.",
    formatTipBySource: {
      png: "For PNG uploads, WEBP often gives a smaller output size.",
      jpg: "For JPG uploads, WEBP is usually a good quality-to-size tradeoff.",
      jpeg: "For JPG uploads, WEBP is usually a good quality-to-size tradeoff.",
      gif: "For GIF uploads, PNG or WEBP is easier to reuse and share.",
      ico: "For ICO uploads, PNG is the safest cross-platform target.",
    },
    formatGuidanceHeadingDefault: "Recommended output formats",
    formatGuidanceHeadingBySource: {
      png: "You uploaded a PNG file",
      jpg: "You uploaded a JPG file",
      jpeg: "You uploaded a JPG file",
      gif: "You uploaded a GIF file",
      ico: "You uploaded an ICO file",
    },
    formatGuidanceQuickPickLabel: "Quick pick",
    processingTrustMessage:
      "Your file is processed only in your browser and is never uploaded to a server.",
    conversionFailedHeading: "Conversion failed.",
    failureGuides: {
      unsupported_target_format:
        "Your browser may not support the selected output format.",
      canvas_context_unavailable:
        "Canvas initialization failed. Refresh the page and try again.",
      memory_limit_exceeded:
        "Memory limits were reached. Try a smaller file or another format.",
      image_decode_failed:
        "Image decoding failed. Please verify the source file is valid.",
      conversion_aborted:
        "Conversion was interrupted. Retry with the same settings.",
      conversion_runtime_error:
        "A runtime error occurred. Trying another output format often helps.",
      unknown:
        "An unexpected error occurred. Try another format or a smaller file.",
    },
    errorUploadSafetyMessage: "Your file was not uploaded to any server.",
    recoveryFormatsHeading: "Try another format",
    recoveryRecommendedFormat: (format) => `Recommended format: ${format.toUpperCase()}`,
    trustMessage:
      "Your file is processed only in your browser and is never uploaded to a server.",
    downloadLabel: (filename) => `Download (${filename})`,
    chooseAnotherFile: "Choose another file",
    chooseFormatLabel: "Choose a format",
    retrySameSettingsLabel: "Retry with same settings",
    convertLabel: (source, target) =>
      `Convert ${source.toUpperCase()} → ${target.toUpperCase()}`,
    statusLoading: "Loading file...",
    statusConverting: "Converting...",
    statusDone: "✨ Conversion complete!",
    statusError: "❌ Conversion failed",
    postConversionAdBadge: "Sponsored",
    postConversionAdTitle: "Keep your workflow moving",
    postConversionAdDescription:
      "Your conversion is done. Explore another tool for the next step.",
    postConversionAdCtaLabel: "Explore tools",
    postConversionAdHref: "https://example.com",
  },
};
