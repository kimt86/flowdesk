# Office Hours — FlowDesk 발표자료 뷰어

> 2026-04-06 | 발표자료(presentations) 기능 추가

## 입력

workspace에 presentations 폴더가 생겼다. HTML 형식 발표자료를 FlowDesk에서 볼 수 있는 기능 추가.

## Office Hours 결과

### 목표
- **Intrapreneurship** — 사내 프로젝트, 빠르게 쉽

### Status Quo
- 현재 링크 공유 방식으로 발표자료 공유 중
- 파일 구조: `presentations/YYYY/MM/YYYY-MM-DD-title.html`
- HTML 슬라이드 형식 (960px 고정 폭, CSS 자체 포함)

### Pain Point
- 아직 특별한 불편 없음 (체계를 막 만들었기 때문)
- FlowDesk에 통합하면 한 곳에서 팀 자산(할일/문서/주간보고/회의록/발표자료) 모두 관리 가능

### MVP 범위 (사용자 확정)
- **목록 페이지**: presentations/ 스캔, 날짜순 정렬, 검색
- **뷰어**: 새 탭으로 열기 (HTML 파일 정적 서빙)
- **검색**: 제목/날짜로 필터링
- **사이드바 메뉴 추가**

### Viewer 결정
- **새 탭으로 열기** 방식 채택
- 이유: 가장 단순, CSS 충돌 없음, 원본 디자인 100% 보존
- HTML 파일을 API로 서빙 → 새 탭에서 열기

## 문제 재정의

> 팀의 발표자료가 FlowDesk 밖에 있어서 별도로 찾아야 한다.
> FlowDesk에 목록/검색을 추가하면 한 곳에서 모든 팀 자산을 관리할 수 있다.

## 기술 접근 초안

### 파일 구조
```
WORKSPACE_ROOT/
├── presentations/
│   └── YYYY/
│       └── MM/
│           └── YYYY-MM-DD-title.html
```

### 재사용 인프라 (meetings 패턴과 동일)
- `lib/paths.ts` — PRESENTATIONS_DIR 상수 추가
- `lib/presentations.ts` — scanPresentations(), HTML title 추출
- `app/presentations/page.tsx` — 목록 페이지 (SSR)
- `GET /api/presentations/serve` — HTML 파일 정적 서빙 (새 탭용)
- `components/presentation-list.tsx` — 목록 컴포넌트 (검색 포함)
- `components/sidebar.tsx` — "발표자료" 메뉴 추가

### 메타데이터 추출
- HTML `<title>` 태그에서 제목 추출
- 파일 경로에서 날짜 추출 (YYYY-MM-DD)
- 파일 크기로 부가 정보

## 대상 사용자
- CLT 디지털팀 팀원
- 발표자료를 작성하고 공유하는 팀원

## 성공 지표
- 발표자료 목록 정상 렌더링
- 제목/날짜 검색 동작
- 새 탭에서 HTML 원본 정상 표시
- 기존 기능 영향 없음

## 범위 밖
- 발표자료 생성/편집 (파일 기반 작성)
- iframe 임베드
- PDF 변환
- 발표 모드 (프레젠테이션 컨트롤)
- 태그/카테고리 분류
