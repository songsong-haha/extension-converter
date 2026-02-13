# Loop Auto-Promote Runbook

이 문서는 `loop` 에이전트가 반복 실행 시 따라야 하는 표준 운영 순서입니다.

## Standard Flow

1. 작업 시작:

```bash
npm run agent:task:start -- <task-slug> main
```

2. `loop/prd.json`의 `branchName`을 아래 형식으로 설정:

```json
"branchName": "agent/growth/<task-slug>"
```

3. 자동 승격 루프 시작:

```bash
npm run loop:bg:start:auto-promote
```

4. 모니터링:

```bash
npm run loop:bg:status
```

5. 중지:

```bash
npm run loop:bg:stop
```

## Expected Completion Behavior

`loop`가 `<promise>COMPLETE</promise>`를 출력하면 자동으로 아래 흐름이 실행됩니다.

- `agent/growth/<task-slug>` push
- `agent/qa/<task-slug>` push
- QA gate 실행 (`lint`, `build`, `test:e2e`, `qa:ai`)
- `main`으로 merge + push
- local growth/qa worktree + branch 삭제
- remote growth/qa branch 삭제 시도 (실패해도 non-blocking)

## Notes

- `branchName`은 반드시 `agent/growth/<task-slug>` 형식이어야 합니다.
- `loop:bg:start:auto-promote` 실행 시 형식이 다르면 루프는 실패하고 중단됩니다.
- macOS에서 `~/Documents` 경로는 `launchd` 권한 문제가 생길 수 있으므로 `loop:bg:*` 사용을 권장합니다.
