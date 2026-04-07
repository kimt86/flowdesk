# FlowDesk — 프로젝트 진행 현황

## 단계 진행 상황

- [x] **01 — Office Hours** ([01-office-hours.md](stages/01-office-hours.md))
- [x] **02 — CEO Review** ([02-ceo-review.md](stages/02-ceo-review.md))
- [x] **03 — Engineering Review** ([03-eng-review.md](stages/03-eng-review.md))
- [x] **04 — SDD (구현)** ([04-sdd/](stages/04-sdd/))
- [x] **05 — Code Review** (`/gf-review`) — 이슈 1건, 수정 완료
- [x] **06 — QA** (`/gf-qa`) — 19개 테스트 전체 통과
- [ ] **07 — Deploy** (`/gf-deploy`)
- [ ] **08 — Post-deploy Check** (`/gf-deploy-check`)

## 현재 상태

- **단계**: 코드 리뷰 통과 (이슈 0건)
- **다음 액션**: 커밋

## MVP 목록 (확정)

1. `lib/presentations.ts` — 스캔, title 추출, 날짜 파싱
2. `lib/paths.ts` — PRESENTATIONS_DIR 상수
3. `/presentations` 목록 페이지 (검색 포함)
4. `GET /api/presentations/serve` — HTML 정적 서빙
5. `components/presentation-list.tsx` — 목록 + 검색
6. 사이드바 "발표자료" 메뉴 추가

## 최근 완료 (2026-04-06)

### 회의록 기능
- lib/meetings.ts — 스캔/파싱/안전읽기
- components/meeting-list.tsx — 목록 컴포넌트
- app/meetings/page.tsx — 목록 페이지
- app/meetings/view/page.tsx — 상세 페이지
- app/api/meetings/route.ts — 생성 API
- lib/paths.ts — MEETING_MINUTES_DIR 추가
- components/sidebar.tsx — "회의록" 메뉴 추가

### 이전: 홈+현황 통합
- app/page.tsx — 현황 로직 병합
- app/status/ — 삭제

## 결정 사항

1. 홈+현황 통합: 접근법 A (병합)
2. 회의록: 접근법 A (주간보고 패턴 복제)
3. 프론트매터 파싱: gray-matter 사용 (문서 트래커와 동일)
4. 사이드바: 홈/할일/회의록/문서/주간보고 (5개)
