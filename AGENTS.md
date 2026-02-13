# AGENTS.md instructions for /Users/song-eun-u/Documents/github/extension-converter

## Compact Memory Rule
- Before any context compact (manual or auto), run `pnpm codex:precompact -- --summary "<what was done>" --mistakes "<m1>|<m2>" --improvements "<b1>|<b2>" --global "<cross-project lesson>" --local "<project lesson>"`.
- Keep `~/.codex/codex.md` global: only reusable principles that apply to most projects.
- Keep `codex.md` local: mostly project-specific decisions, pitfalls, and repeatable playbooks for this repo.
- If only local knowledge changed, still run the command and pass an empty `--global ""`.
- If only global knowledge changed, still run the command and pass an empty `--local ""`.

## Scope Hygiene
- Do not dump raw logs into `codex.md` files.
- Store concise, actionable lessons so future turns can execute faster and avoid repeated mistakes.
- Prefer "mistake -> better approach" pairs over generic retrospective text.
