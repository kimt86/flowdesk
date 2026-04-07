# SDD Plan — FlowDesk

## 기술 스택

| 카테고리 | 기술 | 버전 |
|----------|------|------|
| 프레임워크 | Next.js (App Router) | 13.5.6 |
| 언어 | TypeScript | 5.x |
| UI 라이브러리 | React | 18.x |
| 스타일링 | Tailwind CSS | 3.4.1 |
| UI 컴포넌트 | Radix UI (Dialog, Dropdown, Separator, Tooltip) | latest |
| 아이콘 | Lucide React | 1.7.0 |
| DB | SQLite via LibSQL | 0.17.2 |
| ORM | Drizzle ORM | 0.45.2 |
| 마크다운 | Remark + Rehype + gray-matter | 15.x |
| 파일감시 | Chokidar | 5.0.0 |
| 유틸 | date-fns, clsx, tailwind-merge, CVA | - |

## 파일 구조

```
app/
├── layout.tsx              # 루트 레이아웃 (Sidebar 포함)
├── page.tsx                # 홈 대시보드
├── globals.css             # 글로벌 스타일
├── api/
│   ├── todos/route.ts      # GET/POST 할일
│   ├── todos/[id]/route.ts # PATCH/DELETE/GET 개별 할일
│   ├── docs/route.ts       # PATCH/DELETE 문서
│   ├── docs/preview/route.ts # POST 마크다운 미리보기
│   └── worklog/route.ts    # POST 주간 업무일지
├── todos/page.tsx          # 칸반 보드
├── status/page.tsx         # 현황 대시보드
├── docs/
│   ├── page.tsx            # 문서 목록
│   ├── edit/page.tsx       # 문서 편집기
│   └── view/page.tsx       # 문서 뷰어
└── weekly/
    ├── page.tsx            # 주간 보고 목록
    └── view/page.tsx       # 주간 보고 상세

components/
├── sidebar.tsx             # 반응형 사이드바
├── prompt-builder-client.tsx
├── weekly-report-list.tsx
├── todo/
│   └── todo-board.tsx      # 칸반 보드 컴포넌트
└── docs/
    ├── docs-tracker.tsx    # 문서 상태 트래커
    ├── doc-editor.tsx      # 마크다운 에디터
    ├── doc-delete-button.tsx
    ├── editor-toolbar.tsx  # 포매팅 툴바
    └── editor-preview.tsx  # 실시간 미리보기

lib/
├── db/
│   ├── client.ts           # LibSQL 클라이언트, CRUD
│   └── schema.ts           # Todo 테이블 스키마
├── parsers/
│   └── todo-parser.ts      # 마크다운 Todo 파싱
├── hooks/
│   ├── use-debounce.ts
│   └── use-markdown-editor.ts
├── docs.ts                 # 문서 파일 스캔/읽기/쓰기
├── docs-shared.ts          # 공유 타입/상수
├── markdown.ts             # 마크다운 렌더링 파이프라인
├── paths.ts                # 경로 상수
├── types.ts                # TypeScript 인터페이스
├── sync.ts                 # 파일→DB 동기화, 파일 감시
├── utils.ts                # cn() 유틸리티
└── worklogs.ts             # 주간 업무일지 파싱
```

## 데이터 모델

### todos 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | 예: "todo-0-1" |
| content | TEXT | 작업 내용 |
| status | TEXT | todo / in-progress / blocked / done |
| priority | TEXT | high / medium / low |
| category | TEXT | @개발, @디자인 등 |
| due_date | TEXT | 마감일 (YYYY-MM-DD) |
| done_date | TEXT | 완료일 |
| doc_refs | TEXT | JSON 배열 [{issueId?, path}] |
| line_index | INTEGER | todo.md 내 줄번호 |
| raw_line | TEXT | 원본 마크다운 라인 |
| created_at | TEXT | 생성 시각 |
| updated_at | TEXT | 수정 시각 |

### sync_meta 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| key | TEXT PK | 메타데이터 키 |
| value | TEXT | 메타데이터 값 |

## API 설계

| 메서드 | 경로 | 요청 본문 | 응답 |
|--------|------|----------|------|
| GET | /api/todos | - | { todos: Todo[] } |
| POST | /api/todos | { content, priority?, category?, dueDate? } | { todos: Todo[] } |
| PATCH | /api/todos/[id] | { status?, content?, priority?, category?, dueDate? } | { todos: Todo[] } |
| DELETE | /api/todos/[id] | - | { todos: Todo[] } |
| GET | /api/todos/[id] | - | { todo: Todo } |
| PATCH | /api/docs?path= | { content } | { success: true } |
| DELETE | /api/docs?path= | - | { success: true } |
| POST | /api/docs/preview | { content, relPath? } | { html: string } |
| POST | /api/worklog | { content, weekNumber } | { success: true } |
