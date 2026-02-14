import { type Locale } from "./constants";

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
