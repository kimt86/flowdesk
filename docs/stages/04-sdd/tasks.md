# SDD Tasks — FlowDesk

## 발표자료 뷰어

### Phase 1: 데이터 레이어

- [x] lib/paths.ts — PRESENTATIONS_DIR 상수 추가
- [x] lib/presentations.ts — PresentationMeta, scanPresentations(), resolvePresentationSafe()

### Phase 2: 목록 UI

- [x] components/presentation-list.tsx — 연도별 그룹, 검색, 슬라이드 수
- [x] app/presentations/page.tsx — 목록 페이지 (SSR)

### Phase 3: 서빙 API

- [x] app/api/presentations/serve/route.ts — GET HTML 정적 서빙

### Phase 4: 네비게이션

- [x] components/sidebar.tsx — "발표자료" 메뉴 추가

### Phase 5: 검증

- [x] tsc --noEmit 통과
- [x] npm run lint 통과
- [ ] npm run build 통과

## Additional Tasks (added 2026-04-07)

- [x] 사이드바 접기/펼치기 — components/sidebar.tsx (localStorage로 상태 유지, Tooltip으로 접힌 상태 라벨 표시)
- [x] 문서 트래커에서 문서 상태(draft/review/final) 편집 — docs-tracker.tsx + /api/docs/status
- [x] 문서 목록 검색 — docs-tracker.tsx (제목/태그 클라이언트 필터링)
- [x] 회의록 목록 검색 — meeting-list.tsx (제목/참석자/날짜 클라이언트 필터링)

## 이전 완료 작업

### 회의록 기능

- [x] lib/meetings.ts, components/meeting-list.tsx, app/meetings/*, app/api/meetings/*
- [x] 코드 리뷰 통과, QA 19개 테스트 통과

### 홈+현황 통합

- [x] app/page.tsx 통합, app/status/ 삭제
- [x] 코드 리뷰 통과
