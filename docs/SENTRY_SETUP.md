# Sentry Setup Guide (Worktree + Agent)

This repository uses a multi-agent worktree workflow. Apply and review Sentry changes in an isolated worktree first.

## 1) Create agent worktree

```bash
npm run agent:create -- sentry setup main
cd .worktrees/sentry-setup
```

Or directly:

```bash
git worktree add .worktrees/sentry-setup -b agent/sentry/setup main
cd .worktrees/sentry-setup
```

## 2) Install Sentry SDK

```bash
npm install @sentry/nextjs
```

## 3) Required env vars

Create `.env.local` (local runtime):

```bash
NEXT_PUBLIC_SENTRY_DSN=https://<public_key>@o<orgid>.ingest.sentry.io/<projectid>
```

For source map upload (CI/CD or local build upload), set:

```bash
SENTRY_AUTH_TOKEN=<your_auth_token>
SENTRY_ORG=<your_org_slug>
SENTRY_PROJECT=<your_project_slug>
```

## 4) Files added by this integration

- `next.config.ts`
- `src/instrumentation-client.ts`
- `src/instrumentation.ts`
- `src/sentry.server.config.ts`
- `src/sentry.edge.config.ts`
- `src/app/global-error.tsx`

## 5) Configure project binding in `next.config.ts`

Set `org` and `project` in the `withSentryConfig(...)` options if you want release/source-map integration:

```ts
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
```

## 6) Verify locally

1. Run app:

```bash
npm run dev
```

2. Trigger a test error (example in any client component):

```tsx
<button
  type="button"
  onClick={() => {
    throw new Error("Sentry Test Error");
  }}
>
  Break the world
</button>
```

3. Confirm events in Sentry:
- Issues (error)
- Traces (performance)
- Logs (if `enableLogs: true`)

## 7) Agent handoff

```bash
git status
git add .
git commit -m "feat(observability): integrate sentry for nextjs app router"
```

Then merge branch `agent/sentry/setup` back to `main` via PR or local merge.
