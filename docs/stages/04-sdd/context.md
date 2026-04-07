# SDD Context — FlowDesk

## 구현 상태: 발표자료 뷰어 구현 완료

### 발표자료 뷰어 (2026-04-06)

#### 생성된 파일

- `lib/presentations.ts` (108줄) — scanPresentations(), resolvePresentationSafe(), title/slide/date 추출
- `components/presentation-list.tsx` (104줄) — 연도별 그룹, 클라이언트 검색, 슬라이드 수/파일 크기 표시
- `app/presentations/page.tsx` (24줄) — 목록 페이지 SSR
- `app/api/presentations/serve/route.ts` (30줄) — GET HTML 서빙 (path traversal 방지, Content-Type 설정)

#### 수정된 파일

- `lib/paths.ts` — PRESENTATIONS_DIR 상수 추가
- `components/sidebar.tsx` — "발표자료" 메뉴 추가 (Presentation 아이콘), 5개 → 6개 메뉴

### 검증 결과

- 파일 길이: 모두 500줄 이하 (최대 133줄)
- tsc --noEmit: 통과
- npm run lint: 경고/에러 없음

### 주요 파일 경로

| 기능 | 파일 |
|------|------|
| 발표자료 스캔/파싱 | lib/presentations.ts |
| 발표자료 목록 | app/presentations/page.tsx |
| 발표자료 서빙 API | app/api/presentations/serve/route.ts |
| 발표자료 목록 컴포넌트 | components/presentation-list.tsx |
