This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Google Analytics (GA4)

Set your GA measurement ID:

```bash
echo 'NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX' >> .env.local
```

The app will automatically:

- load GA script only when the env var exists
- send `page_view` on route changes
- send conversion funnel events from the converter widget

See `docs/GA_AGENT_WORKFLOW.md` for event catalog and validation checklist.

## Agent Workflow

This repo supports parallel work using Git worktrees.

```bash
pnpm agent:create <agent-name> <task-slug> [base-branch] [task-template]
pnpm agent:list
pnpm agent:remove <agent-name> <task-slug>
```

GA task example:

```bash
pnpm agent:create analytics event-conversion main ga
```

This command creates:

- `.worktrees/<agent>-<task>/` worktree
- `.agents/<agent>-<task>.json` metadata
- `.agents/<agent>-<task>.md` task card (from template)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
