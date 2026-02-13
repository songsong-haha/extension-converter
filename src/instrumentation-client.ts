import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sends user IP and headers when available.
  sendDefaultPii: true,

  // Sample 100% in development, lower in production.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Send app logs to Sentry Logs.
  enableLogs: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
