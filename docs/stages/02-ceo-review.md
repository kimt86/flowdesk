# CEO Review — FlowDesk 발표자료 뷰어

> 2026-04-06 | 발표자료 기능

## 선택 모드: Validate (현재 방향 적절)

### 근거

기존 검증된 패턴(회의록/주간보고)을 따르는 저위험 기능 추가. "한 곳에서 모든 팀 자산 관리"라는 FlowDesk의 핵심 가치에 부합. 범위가 명확하고 기술적 불확실성이 낮음.

### Premise 검증

1. "한 곳에서 관리" 가치 → 이미 5개 콘텐츠 타입이 FlowDesk에 있으므로 일관성 확보
2. "새 탭 열기" 방식 → HTML 슬라이드의 자체 CSS/JS 보존에 최적
3. "검색 포함" → 사용자 명시적 요청, 클라이언트 필터링으로 구현 단순

## MVP 기능 목록

### Must Have (필수)

1. **`lib/presentations.ts`** — 스캔, HTML `<title>` 추출, 파일경로에서 날짜 파싱
2. **`lib/paths.ts`** — PRESENTATIONS_DIR 상수 추가
3. **`/presentations` 목록 페이지** — 날짜순 정렬, 연도별 그룹, 제목/날짜 검색
4. **`GET /api/presentations/serve`** — HTML 파일 정적 서빙 (path traversal 방지)
5. **`components/presentation-list.tsx`** — 목록 컴포넌트 + 클라이언트 검색
6. **사이드바 "발표자료" 메뉴 추가** — 5개 → 6개

### Nice to Have (선택)

- 파일 크기 표시
- 슬라이드 수 표시 (`.slide` 클래스 카운트)

### 제거 (범위 밖)

| 기능 | 제거 이유 |
|------|----------|
| 발표자료 생성/편집 | 파일 기반 작성이 워크플로우에 적합 |
| iframe 임베드 | CSS 충돌 위험, 사용자가 새 탭 선택 |
| PDF 변환 | 외부 의존, MVP 범위 초과 |
| 발표 모드 | 복잡도 높음, 브라우저에서 직접 보기로 충분 |

## Failure Mode Analysis

| 시나리오 | 처리 |
|----------|------|
| presentations/ 없음 | 빈 배열, 빈 목록 메시지 |
| `<title>` 없음 | 파일명에서 제목 추출 |
| 비표준 파일명 | 날짜 없이 표시 |
| path traversal | 경로 검증 차단 |
| 대용량 HTML | 브라우저 처리 (서빙만) |

## 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| 사이드바 메뉴 6개 | 낮음 | 6개는 수용 가능. 7개 이상부터 그룹화 고려 |
| HTML 서빙 보안 | 중간 | path traversal 방지 + PRESENTATIONS_DIR 내부만 허용 |

## 결론

현재 설계를 그대로 진행한다. Validate 모드 — 범위 변경 없음.
