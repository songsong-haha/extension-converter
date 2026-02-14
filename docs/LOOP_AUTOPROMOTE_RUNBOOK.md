# Loop Auto-Promote Runbook

이 문서는 `loop` 에이전트가 반복 실행 시 따라야 하는 표준 운영 순서입니다.

## Standard Flow

1. 작업 시작:

```bash
npm run agent:task:start -- <task-slug> main
```

여러 팀(기본 3개 lane) 동시 시작:

```bash
npm run agent:teams:start -- 3 main
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

`loop`가 `<promise>COMPLETE</promise>`를 출력하면 현재 PRD 사이클을 완료로 간주하고 아래 흐름을 실행합니다.

- `agent/growth/<task-slug>` push
- `agent/ceo/<task-slug>` push
- `agent/qa/<task-slug>` push
- `agent/analytics/<task-slug>` push
- `agent/designer/<task-slug>` push
- QA gate 실행 (`lint`, `build`, `test:e2e`, `qa:ai`)
- `main`으로 merge + push
- local core-team worktree + branch 삭제
- remote core-team branch 삭제 시도 (실패해도 non-blocking)
- 이후 supervisor가 backlog 상태를 확인하고 다음 사이클을 자동 시작합니다.

체크포인트 상태는 `loop/auto-promote-state.json`에 기록되며, 재시도 시 이미 완료된 단계는 건너뜁니다.
정책은 `loop/policy.json`에서 관리합니다.
루프 외곽 제어 상태는 `loop/promotion-controller.json`에 기록됩니다.

## Failure Taxonomy / Circuit Breaker

- `config-fatal`: runtime 파일 누락/미추적(`MODULE_NOT_FOUND`, `missing required file`)은 즉시 격리(open)됩니다.
- `policy-terminal`: branch/gate/merge 정책 실패는 기본 `2회`(`30초` 간격) 제한 재시도 후 격리(open) + fatal 중단됩니다.
- `retryable`: 일시적 push 실패만 제한적으로 재시도합니다.

회로 차단기(circuit breaker) 파라미터:

- `LOOP_PROMOTE_BREAKER_THRESHOLD` (기본 `3`)
- `LOOP_PROMOTE_BREAKER_OPEN_SECONDS` (기본 `300`)
- `LOOP_PROMOTE_POLICY_RETRY_MAX` (기본 `2`)
- `LOOP_PROMOTE_POLICY_RETRY_DELAY_SECONDS` (기본 `30`)

open 상태에서는 auto-promote를 호출하지 않고 즉시 중단하여 같은 completion 토큰 재처리를 방지합니다.
`promotion-controller.json`에는 `policyRetryCount`, `lastFailureAt`, `nextRetryAt`가 추가로 기록됩니다.

## Local Admin Actions

`npm run loop:admin`으로 로컬 대시보드를 실행하면 아래 복구 액션을 사용할 수 있습니다.

- `Reset Breaker`: 브레이커 상태 초기화
- `Retry Promote`: breaker reset -> `loop:doctor` -> 단발 auto-promote 실행
- `Stop Loop`: `loop:bg:stop` 호출

보안이 필요하면 `LOOP_ADMIN_TOKEN`을 설정해 Bearer 토큰 인증을 켭니다.

## Worktree Hygiene

`auto-promote`는 머지 전용 임시 worktree(`loop/tmp-worktrees/*`)를 사용합니다.

- 시작/종료 시 `git worktree prune`
- 임시 worktree는 `git worktree remove --force`로 정리
- promote 동시 실행은 `loop/.promote.lock`으로 차단

## Self-Heal Policy

- supervisor의 self-heal 코드수정은 기본 비활성입니다.
- 필요 시에만 `LOOP_SELF_HEAL_ENABLED=1`로 명시적으로 활성화하세요.

## Notes

- `branchName`은 반드시 `agent/growth/<task-slug>` 형식이어야 합니다.
- `loop:bg:start:auto-promote` 실행 시 형식이 다르면 루프는 fatal(config)로 분류되어 중단됩니다.
- macOS에서 `~/Documents` 경로는 `launchd` 권한 문제가 생길 수 있으므로 `loop:bg:*` 사용을 권장합니다.
- `npm run loop:doctor`는 runtime 필수 파일의 `존재 + git tracked` 계약을 검사합니다.
