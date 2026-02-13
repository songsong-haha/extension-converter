import ConverterWidget from "@/features/converter/components/converter-widget";
import { UNIQUE_TARGET_FORMATS } from "@/features/converter/lib/format-registry";

const SUPPORTED_FORMAT_LABELS = UNIQUE_TARGET_FORMATS.map((format) => format.label);
const SUPPORTED_FORMAT_COUNT = SUPPORTED_FORMAT_LABELS.length;
const HERO_FORMAT_PREVIEW = SUPPORTED_FORMAT_LABELS.slice(0, 4).join(" · ");
const HERO_SUPPORT_COPY = `${HERO_FORMAT_PREVIEW} 포함 총 ${SUPPORTED_FORMAT_COUNT}개 포맷 변환 지원`;
const PRIMARY_CTA_LABEL = "이미지 업로드하고 무료 변환";

const FEATURES = [
    {
      icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
          stroke="var(--primary-400)"
          strokeWidth="1.5"
        />
        <path
          d="M8 12L11 15L16 9"
          stroke="var(--primary-400)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "100% 무료",
    desc: "제한 없이 원하는 만큼 변환하세요. 회원가입도 필요 없습니다.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
          stroke="var(--accent-400)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "초고속 변환",
    desc: "브라우저에서 바로 처리되어 대기 시간이 없습니다.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="11"
          width="18"
          height="11"
          rx="2"
          stroke="var(--success-400)"
          strokeWidth="1.5"
        />
        <path
          d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
          stroke="var(--success-400)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16" r="1.5" fill="var(--success-400)" />
      </svg>
    ),
    title: "완벽한 프라이버시",
    desc: "파일이 서버에 업로드되지 않습니다. 모든 변환은 당신의 브라우저 안에서.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 16L4 8C4 5.79086 5.79086 4 8 4L16 4C18.2091 4 20 5.79086 20 8L20 16C20 18.2091 18.2091 20 16 20L8 20C5.79086 20 4 18.2091 4 16Z"
          stroke="var(--primary-300)"
          strokeWidth="1.5"
        />
        <path
          d="M9 12H15M12 9V15"
          stroke="var(--primary-300)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: `${UNIQUE_TARGET_FORMATS.length}가지 포맷`,
    desc: `${SUPPORTED_FORMAT_LABELS.join(", ")} 간 자유로운 변환.`,
  },
];

export default function Home() {
  return (
    <div className="bg-gradient-animated min-h-screen">
      {/* Decorative orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[var(--primary-500)] rounded-full opacity-[0.04] blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[var(--accent-500)] rounded-full opacity-[0.04] blur-[100px]" />
      </div>

      <main className="relative max-w-4xl mx-auto px-6 py-16 sm:py-24">
        {/* Hero */}
        <section className="text-center mb-16 animate-fade-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] mb-6 backdrop-blur-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-400)] animate-pulse" />
            100% 무료 · 서버 업로드 없음
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-4">
            이미지를 올리면,
            <br className="hidden sm:block" />{" "}
            <span className="text-gradient">원하는 포맷으로 즉시 변환</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            {HERO_SUPPORT_COPY}
            <br className="sm:hidden" /> 회원가입 없이 브라우저에서 바로 변환하세요.
          </p>

          <a
            href="#converter-widget"
            className="inline-flex mt-8 items-center justify-center rounded-xl bg-[var(--primary-500)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-100)]"
          >
            {PRIMARY_CTA_LABEL}
          </a>
        </section>

        {/* Converter */}
        <section
          id="converter-widget"
          className="glass p-6 sm:p-8 mb-20 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          <ConverterWidget />
        </section>

        {/* Features */}
        <section
          className="animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          <h2 className="text-center text-sm font-medium text-[var(--text-muted)] uppercase tracking-widest mb-8">
            왜 Extension Converter인가요?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass-card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-200)] flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                    {f.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-[var(--glass-border)] text-center">
          <p className="text-xs text-[var(--text-muted)]">
            © 2025 ExtensionConverter. All conversions happen in your browser.
          </p>
        </footer>
      </main>
    </div>
  );
}
