# Engineering Review — 발표자료 뷰어

> 2026-04-06 | 발표자료 뷰어 아키텍처 설계

## 데이터 흐름

```
presentations/YYYY/MM/YYYY-MM-DD-title.html
  │
  ▼
scanPresentations() ── lib/presentations.ts (HTML <title> 파싱, .slide 카운트)
  │
  ▼
app/presentations/page.tsx (SSR) → PresentationList (클라이언트 검색)
                                       │
                                 "새 탭으로 열기" 클릭
                                       │
                                       ▼
                          GET /api/presentations/serve?path=...
                                       │
                                       ▼
                          HTML 원본 응답 (Content-Type: text/html)
```

## 파일 목록

| 파일 | 액션 | 역할 |
|------|------|------|
| lib/paths.ts | 수정 | PRESENTATIONS_DIR 상수 |
| lib/presentations.ts | 생성 | 스캔, title 추출, 안전 서빙 |
| app/presentations/page.tsx | 생성 | 목록 페이지 (SSR) |
| app/api/presentations/serve/route.ts | 생성 | HTML 정적 서빙 |
| components/presentation-list.tsx | 생성 | 목록 + 검색 |
| components/sidebar.tsx | 수정 | "발표자료" 메뉴 추가 |

## API

| 메서드 | 경로 | 입력 | 출력 |
|--------|------|------|------|
| GET | /api/presentations/serve?path= | query param | Raw HTML 또는 404 |

## 데이터 모델

```typescript
interface PresentationMeta {
  filePath: string;
  relPath: string;
  title: string;
  date: string;
  slideCount: number;
  fileSize: number;
  year: number;
  month: string;
}
```

## 구현 순서

1. lib/paths.ts + lib/presentations.ts
2. components/presentation-list.tsx + app/presentations/page.tsx
3. app/api/presentations/serve/route.ts
4. components/sidebar.tsx 수정
5. 검증
