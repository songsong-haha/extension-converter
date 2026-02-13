# GA Instrumentation Task Card

- Agent Name: {{AGENT_NAME}}
- Task Slug: {{TASK_SLUG}}
- Branch: {{AGENT_BRANCH}}
- Worktree Path: {{WORKTREE_PATH}}
- Objective:
- Target Funnel Stage: acquisition / activation / retention
- Events in Scope:
- Constraints:
- Inputs:
- Definition of Done:
  - Event names and params documented in `docs/GA_AGENT_WORKFLOW.md`
  - Event fires once per user action (no duplicate fire on rerender)
  - `pnpm lint` passes in worktree
- Validation Checklist:
  - GA DebugView event observed
  - Payload params verified
  - No runtime error when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is unset
- Handoff Notes:
