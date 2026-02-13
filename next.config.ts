import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Optional for release and source map upload workflows.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Set in environment for source-map upload.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Optional but recommended if ad blockers affect event delivery.
  tunnelRoute: "/monitoring",

  // Keep build logs quieter outside CI.
  silent: !process.env.CI,
});
