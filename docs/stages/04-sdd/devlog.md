# Devlog — FlowDesk

## 2026-04-06 — gf-adopt로 합류

### 분석 결과
- **프로젝트**: FlowDesk — CLT 디지털팀 작업/문서 관리 시스템
- **기술 스택**: Next.js 13.5.6 + TypeScript + SQLite + Tailwind CSS
- **소스 파일**: 약 45개
- **상태**: 1차 구현 완료
- **테스트**: 없음

### 진행률
- 핵심 기능 (Todo, 문서, 주간보고, 대시보드) 모두 동작
- API 라우트 8개 구현 완료
- 파일 동기화 및 감시 동작 중
- 반응형 UI 구현 완료

### 다음 단계
- 코드 ��뷰 (`/gf-review`)
- 빌드/린트 ��증
- QA 테스트

## 2026-04-06 — 홈+현황 통합

### 작업 내용
홈(`/`)과 현황(`/status`) 페이지를 하나로 병합.

### 수정 파일
- `app/page.tsx` — 현황 로직 병합 (완료율 바, 카테고리별 분석, 최근 완료 추가. 인사말/바로가기 제거. "할 일" 카드 → "전체" 카드로 변경)
- `components/sidebar.tsx` — navItems에서 `/status` 제거, BarChart2 import 제거
- `app/status/page.tsx` — 삭제 (디렉토리 포함)

### 주요 결정
- 통계 카드 "할 일" → "전체"로 변경 (CEO 리뷰에서 확정된 MVP 사양)
- StatCard에 Link 유지 (클릭 시 /todos 필터 이동)
- HTML 엔티티(&#10003;, &#9675;) 사용 — 이모지 대신 안전한 문자

### 검증 결과
- 파일 길이: page.tsx 247줄, sidebar.tsx 129줄 (500줄 이하)
- 시크릿 스캔: 통과
- tsc --noEmit: 통과 (.next 캐시 정리 후)
- npm run lint: 경고/에러 없음

### 다음 에이전트 참고
- `.next/types/app/status/` 캐시 수동 삭제함. `npm run build` 시 자동 정리될 것
- 코드 리뷰 대기 (`/gf-review`)

## 2026-04-06 — 회의록 기능 구현

### 작업 내용
회의록(meeting-minutes) 기능을 FlowDesk에 추가. 주간보고 패턴을 기반으로 독립적 구현.

### 생성 파일
- `lib/meetings.ts` — scanMeetings(), readMeetingSafe() (gray-matter 프론트매터 파싱)
- `components/meeting-list.tsx` — 연도별 그룹, 상태 배지(초안/완료), 참석자/태그
- `app/meetings/page.tsx` — 목록 페이지 (SSR)
- `app/meetings/view/page.tsx` — 상세 보기 (프론트매터 메타데이터 + 마크다운 렌더링)
- `app/api/meetings/route.ts` — POST API (날짜 검증, 경로 안전 검증, 자동 프론트매터)

### 수정 파일
- `lib/paths.ts` — MEETING_MINUTES_DIR 상수 추가
- `components/sidebar.tsx` — "회의록" 메뉴 추가 (Calendar 아이콘)

### 주요 결정
- gray-matter로 프론트매터 파싱 (worklogs의 테이블 파싱 대신, 문서 트래커와 동일 방식)
- 사이드바 메뉴 순서: 홈 → 할 일 → 회의록 → 문서 트래커 → 주간 보고서
- API에서 파일명에 제목 포함 (meeting-YYYYMMDD-title.md)

### 검증 결과
- tsc --noEmit: 통과
- npm run lint: 경고/에러 없음
- 시크릿/안티패턴 스캔: 통과

## 2026-04-06 — 회의록 코드 리뷰 (gf-review)

### 리뷰 대상
7개 파일 (lib/meetings.ts, components/meeting-list.tsx, app/meetings/*, app/api/meetings/*, sidebar.tsx, paths.ts)

### 결과: 이슈 1건 발견, 수정 완료
- **이슈**: app/api/meetings/route.ts — title에 큰따옴표 포함 시 YAML 프론트매터 깨짐
- **수정**: escYaml() 헬퍼로 title, attendees, tags의 큰따옴표 이스케이프
- **예방**: 프론트매터 생성 시 항상 사용자 입력 이스케이프 필요

### 통과 항목
- 설계 이탈: 없음 (MVP 7개 항목 모두 반영)
- 타입 안전: any 미사용
- 보안: path traversal 방지, XSS 방지
- 성능: SSR 서버 컴포넌트

### 다음 단계
- QA 테스트 (`/gf-qa`)

## 2026-04-06 — 코드 리뷰 (gf-review)

### 리뷰 대상
- `app/page.tsx` (247줄)
- `components/sidebar.tsx` (130줄)

### 결과: 이슈 0건, 리뷰 통과
- 로직 에러: 없음
- 설계 이탈: 없음 (MVP 8개 항목 모두 반영)
- 타입 안전: any 미사용, 모든 타입 명시
- 코드 품질: 500줄 이하, 중복/하드코딩 없음
- 보안: XSS/SQL injection 해당 없음
- 성능: SSR 서버 컴포넌트, 필터 5회는 무시 가능

### 다음 단계
- QA 테스트 (`/gf-qa`)

## 2026-04-06 — 발표자료 뷰어 구현

### 작업 내용
presentations/ 디렉토리의 HTML 발표자료를 FlowDesk에서 목록/검색/새탭열기하는 기능 추가.

### 생성 파일
- `lib/presentations.ts` — scanPresentations(), resolvePresentationSafe(), HTML title/slide/date 추출
- `components/presentation-list.tsx` — 연도별 그룹, 클라이언트 검색, 슬라이드 수/파일 크기
- `app/presentations/page.tsx` — 목록 페이지 (SSR)
- `app/api/presentations/serve/route.ts` — GET HTML 정적 서빙 (path traversal 방지)

### 수정 파일
- `lib/paths.ts` — PRESENTATIONS_DIR 상수 추가
- `components/sidebar.tsx` — "발표자료" 메뉴 추가 (Presentation 아이콘)

### 주요 결정
- 새 탭 열기: HTML을 API로 서빙 후 target="_blank"로 링크 (CSS 충돌 방지)
- 클라이언트 검색: 제목+날짜 필터링 (서버 API 불필요)
- title 추출: HTML `<title>` → fallback 파일명
- slide count: `class="slide"` 정규식 매칭

### 검증 결과
- tsc --noEmit: 통과
- npm run lint: 경고/에러 없음

## 2026-04-07 — 코드 리뷰 (gf-review)

### 리뷰 대상
10개 파일 (발표자료 4개, 회의록 편집 3개, 사이드바 1개, 에디터 1개, 회의록 스캔 1개)

### 결과: 이슈 0건, 리뷰 통과
- 로직/설계/타입/코드품질/보안/성능: 모두 PASS

## 2026-04-07 — Task 추가 (gf-task): 사이드바 접기/펼치기

데스크톱 사이드바를 접고 펼 수 있는 토글 기능 추가 요청.
대상 파일: components/sidebar.tsx, app/layout.tsx
localStorage로 접힘 상태 유지.

## 2026-04-07 — 사이드바 접기/펼치기 구현

### 작업 내용
데스크톱 사이드바에 접기/펼치기 토글 추가. 접힌 상태에서는 아이콘만 표시, Tooltip으로 라벨 확인 가능.

### 수정 파일
- `components/sidebar.tsx` — 194줄. collapsed 상태 추가, localStorage 유지, PanelLeftClose/PanelLeftOpen 아이콘, Radix Tooltip으로 접힌 상태 라벨, transition-all duration-200 애니메이션

### 주요 결정
- layout.tsx 수정 불필요 — sidebar 내부에서 너비 변경만으로 처리 (w-52 ↔ w-14)
- Radix Tooltip 사용 — 이미 의존성에 포함(@radix-ui/react-tooltip)
- 모바일 드로어는 변경 없음 (접기 기능은 데스크톱 전용)

### 검증 결과
- tsc --noEmit: 통과
- npm run lint: 경고/에러 없음

## 2026-04-07 — Task 추가 (gf-task): 문서 상태 편집 + 검색 기능

3개 태스크 추가:
1. 문서 트래커에서 문서 상태(draft/review/final) 편집 — docs-tracker.tsx
2. 문서 목록 검색 — docs-tracker.tsx (제목/태그 필터링)
3. 회의록 목록 검색 — meeting-list.tsx (제목/참석자 필터링)

## 2026-04-07 — 문서 상태 편집 + 검색 기능 구현

### 작업 내용
1. 문서 트래커에서 상태(초안/검토중/완료) 드롭다운으로 직접 변경 가능
2. 문서 목록에 제목/태그 검색 추가
3. 회의록 목록에 제목/참석자/날짜 검색 추가

### 수정/생성 파일
- `components/docs/docs-tracker.tsx` (243줄) — 검색 input, StatusDropdown, DocCard 분리
- `components/meeting-list.tsx` (111줄) — 검색 input 추가
- `app/api/docs/status/route.ts` (35줄, 신규) — PATCH 상태 변경 API (readDocSafe → regex replace → writeDocSafe)

### 주요 결정
- 상태 변경: 서버 API에서 파일 읽기→status 교체→저장 (클라이언트에서 전체 파일 안 읽음)
- 검색: 모두 클라이언트 필터링 (API 불필요, 파일 수가 적음)
- 상태 변경 후 window.location.reload() — 간단한 방법, SSR 페이지이므로 적절
