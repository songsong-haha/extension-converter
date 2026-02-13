# GA Agent Workflow

## 1) 환경변수 설정

`.env.local`에 측정 ID를 추가합니다.

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

값이 없으면 추적 코드는 로드되지 않습니다.

## 2) 에이전트 작업 분리

GA 작업은 이벤트 단위로 분리해서 진행합니다.

```bash
npm run agent:create -- analytics event-conversion main ga
npm run agent:create -- analytics event-download main ga
npm run agent:create -- analytics event-retention main ga
```

각 작업은 `.agents/<agent>-<task>.md`에 카드가 자동 생성됩니다.

## 3) 코드 구조

- 스크립트 로더: `src/features/analytics/components/google-analytics.tsx`
- 라우트 기반 페이지뷰: `src/features/analytics/components/page-view-tracker.tsx`
- 이벤트 송신 API: `src/features/analytics/lib/ga.ts`
- 실제 이벤트 발행: `src/features/converter/components/converter-widget.tsx`

## 4) 이벤트 카탈로그

- `file_selected`
- `format_selected`
- `conversion_started`
- `conversion_completed`
- `conversion_failed`
- `conversion_retry_started`
- `conversion_retry_result`
- `file_downloaded`

필요 시 `src/features/analytics/lib/ga.ts`의 `AnalyticsEventName` 타입에 이벤트를 추가하고, 해당 이벤트를 발행하는 UI 지점을 명시적으로 연결합니다.

실패 관측 지표:

- `conversion_failed.failure_category`: 실패 원인 분류값
- `conversion_retry_result.retry_outcome`: `success`/`failed`
- 대시보드 파이프라인(`npm run growth:track`)은 `test-results/analytics/events.ndjson`를 읽어 `conversion_failed_to_retry_success_rate`를 계산합니다.

## 5) 검증 체크

1. `npm run dev` 실행
2. GA DebugView에서 이벤트 수신 확인
3. 라우트 이동 시 `page_view` 확인
4. 변환/다운로드 시 이벤트 파라미터 확인
5. `NEXT_PUBLIC_GA_MEASUREMENT_ID` 제거 후 런타임 에러가 없는지 확인
