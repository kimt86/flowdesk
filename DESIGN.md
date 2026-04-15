# FlowDesk Design System
## 한지와 먹 · Hanji + Ink

> 에디토리얼 뉴스프린트 · Korean newspaper meets Linear-class refinement.

---

## 제품 컨텍스트

- **정체**: 마크다운 파일 기반 팀 운영 시스템 (Team OS). 사용자의 `.md` 파일이 Single Source of Truth이며, 앱은 렌즈 역할.
- **사용자**: CLT 디지털팀 (한국어). 하루 종일 이 도구 안에서 살아가는 데일리 드라이버.
- **공간 / 산업**: Personal / Team productivity · PKM · 업무 OS. 경쟁군: Notion, Linear, Obsidian, Logseq, Reflect, Craft.
- **프로젝트 유형**: 내부 팀용 웹 앱 (Next.js 13 + Tailwind + Radix). 향후 공개 릴리즈 계획.
- **태그라인**: 업무의 흐름을 한 곳에서 · Workflow in one place.

---

## 미감 방향 (Aesthetic)

- **방향**: Editorial Newsprint — 한지와 먹
- **장식 수준**: Intentional — 종이 결(grain), 헤어라인, 단청 레드 포인트. 그 외에는 타이포그래피가 모든 일을 한다.
- **분위기**: 잘 인쇄된 한국 일간지를 펼친 듯한 감각. 차분하고, 어른스럽고, 확신에 찬 톤. 장난스럽지 않고, 엔터프라이즈스럽지 않고, AI-forward하지 않음.
- **근거 (Eureka)**: 업계는 "앱 중심, 데이터는 손님" 전제 위에 서 있음. FlowDesk는 "파일 중심, 앱은 렌즈"로 전제를 뒤집음. 인쇄물(신문·잡지)의 시각 언어가 이 철학에 맞음 — 인쇄물도 "파일 우선"이기 때문.

---

## 타이포그래피

**원칙**: 한국어 우선(Korean-first), 영문·숫자와 자연스럽게 혼용. 가중치(weight)와 크기 대비로 위계를 만든다. 컬러풀한 강조는 사용하지 않는다.

### 서체 역할

| 역할 | 서체 | 가중치 | 사용처 |
|---|---|---|---|
| **Display / Hero** | Paperlogy | 700 / 900 | Today 페이지 날짜 헤더, 페이지 타이틀, Presenter 슬라이드 |
| **Body** | Pretendard Variable | 400 / 500 / 700 | 모든 본문, 내비게이션, 카드 타이틀, 회의록 |
| **Data / Tables** | IBM Plex Sans KR | 500 / 700 + `tabular-nums` | 대시보드 통계, 보드 카운트, 정렬 가능한 테이블 |
| **Mono / Metadata** | IBM Plex Mono | 400 / 500 | 타임스탬프, 경로, 태그(대문자), 단축키, 커밋 해시 |
| **Code** | JetBrains Mono | 400 / 500 | 코드 블록 (`<pre>`, `<code>`) |

### 폴백 체인
- **Paperlogy 실패 시**: `"Noto Serif KR", serif` (한국어 display 대체)
- **Pretendard 실패 시**: `-apple-system, BlinkMacSystemFont, "Noto Sans KR", system-ui, sans-serif`

### 로딩 전략
```html
<!-- Pretendard Variable (subset, woff2) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />

<!-- Paperlogy (jsDelivr) -->
<link rel="preload" as="font" type="font/woff2" crossorigin href="https://cdn.jsdelivr.net/gh/innoyouth/Paperlogy@1.0.3/fonts/webfonts/Paperlogy-9Black.woff2" />

<!-- IBM Plex Sans KR + IBM Plex Mono (Google Fonts) -->
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet" />
```
프로덕션에서는 self-host 권장 (`public/fonts/`), `font-display: swap`, 한글/Latin subset 분리.

### 타입 스케일 (Modular scale · base 16px · 1.25 ratio)

| 토큰 | px | rem | 용도 |
|---|---|---|---|
| `text-3xs` | 10 | 0.625 | 매우 작은 타임스탬프, footnote |
| `text-2xs` | 11 | 0.6875 | 메타데이터 (IBM Plex Mono, uppercase, tracking 0.08em) |
| `text-xs` | 12 | 0.75 | 테이블 헤더, 카드 meta |
| `text-sm` | 13.5 | 0.8438 | 사이드바, 카드 본문 |
| `text-base` | 15 | 0.9375 | 기본 본문 |
| `text-md` | 16 | 1 | 카드 타이틀 |
| `text-lg` | 18 | 1.125 | 섹션 서브헤딩 (Paperlogy 700) |
| `text-xl` | 22 | 1.375 | 섹션 헤딩 (Paperlogy 700) |
| `text-2xl` | 28 | 1.75 | 대시보드 통계 값 |
| `text-3xl` | 36 | 2.25 | 페이지 타이틀 (Paperlogy 900) |
| `text-display-sm` | 48 | 3 | 모바일 Today 헤더 |
| `text-display` | 72 | 4.5 | 데스크톱 Today 헤더 (Paperlogy 900) |
| `text-display-lg` | 96 | 6 | Presenter 슬라이드 타이틀 |

### 줄 간격 (Line-height)
- 한국어 본문: **1.55**
- 라틴 본문: **1.6**
- Display (Paperlogy 900): **0.92 – 0.95** (타이트하게)
- 메타데이터 mono: **1.4**

### 글자 사이 (Letter-spacing / Tracking)
- Display: `-0.04em` (tight)
- Body: `-0.005em`
- Mono uppercase metadata: `0.08em` (open)
- Mono code: `0`

---

## 색상

**원칙**: 단일 warm grayscale + 단 하나의 accent. 차가운 회색·순흑은 사용하지 않는다. 단청 레드는 흔적처럼 쓴다 — "시선을 끌 만한 이유가 있을 때만".

### 한지 / Hanji — Light mode

| 토큰 | Hex | 용도 |
|---|---|---|
| `--bg` | `#F5F1E8` | 앱 배경 (warm paper) |
| `--surface` | `#FBF8F1` | 카드·패널 표면 |
| `--surface-2` | `#F0EADC` | 섹션 구분, 사이드바 배경 |
| `--ink` | `#1A1816` | 기본 텍스트 (먹) |
| `--ink-soft` | `#3A3530` | 보조 텍스트 |
| `--muted` | `#6D685F` | 메타데이터, 플레이스홀더 |
| `--border` | `#D9D1C0` | 1px 헤어라인 |
| `--border-strong` | `#B8AE99` | 강조 경계, 포커스 전 상태 |
| `--accent` | `#C9452B` | 단청 레드 — 밑줄, 우선순위 좌측 보더, 브랜드 seal |
| `--success` | `#3D6A4A` | 성공 상태 |
| `--warn` | `#B8861E` | 경고 상태 |
| `--danger` | `#9C3220` | 에러 상태 |

### 수묵 / Sumuk — Dark mode

| 토큰 | Hex | 용도 |
|---|---|---|
| `--bg` | `#141210` | 앱 배경 (먹 종이) |
| `--surface` | `#1D1A17` | 카드·패널 표면 |
| `--surface-2` | `#25211C` | 섹션 구분 |
| `--ink` | `#ECE6D9` | 기본 텍스트 |
| `--ink-soft` | `#CBC4B4` | 보조 텍스트 |
| `--muted` | `#857F74` | 메타데이터 |
| `--border` | `#2B2724` | 1px 헤어라인 (**순회색 아님**) |
| `--border-strong` | `#3C362F` | 강조 경계 |
| `--accent` | `#E06546` | 단청 레드 (OLED shift) |
| `--success` | `#6FA37B` | 성공 상태 |
| `--warn` | `#D9A347` | 경고 상태 |
| `--danger` | `#C95540` | 에러 상태 |

### 다크 모드 철학
- 단순히 밝기 반전이 아니라 **재설계**: 배경은 `#141210`(먹 톤), surface는 `#1D1A17`. 회색 값 전부 warm-shifted.
- accent 레드는 밝기/채도 한 단계 조정 (`#C9452B` → `#E06546`) — OLED에서 번짐(halation) 방지.
- 순흑(`#000`), 순백(`#FFF`), 순회색(`#888` 등) 절대 사용 금지.

---

## 여백 (Spacing)

- **Base unit**: **4px**
- **Density**: Comfortable (Linear보다 여유, Reflect보다 촘촘)
- **Scale**:

| 토큰 | px | 용도 |
|---|---|---|
| `space-2xs` | 4 | 아이콘↔텍스트 |
| `space-xs` | 8 | 카드 내부 요소 간 |
| `space-sm` | 12 | 카드 내부 수직 여백 |
| `space-md` | 16 | 카드 패딩 |
| `space-lg` | 24 | 섹션 내부 구분 |
| `space-xl` | 32 | 섹션 간격 |
| `space-2xl` | 48 | 페이지 패딩 |
| `space-3xl` | 72 | 큰 섹션 간격 |
| `space-4xl` | 96 | Hero masthead 상단 여백 |

---

## 레이아웃

- **접근 방식**: Editorial Hybrid — 앱 화면(Kanban, Today, Projects)은 12-column 그리드, Hero 모먼트(Today 마스트헤드, Presenter, Weekly Report)는 broadsheet 비대칭 구성.
- **그리드**:
  - 모바일 (<640px): 4 col, 16px gutter
  - 태블릿 (640–1024px): 8 col, 20px gutter
  - 데스크톱 (1024–1440px): 12 col, 24px gutter
  - 와이드 (>1440px): 12 col, 32px gutter
- **최대 content 너비**: 1280px (Today, Projects, Ideas) · 1440px (Kanban board) · 100vw (Presenter)
- **Border radius (hierarchical)**:
  - `--radius-none`: **0px** — 입력 underline, hero 요소
  - `--radius-sm`: **2px** — 버튼, 카드, 태그 (기본)
  - `--radius-md`: **4px** — 작은 모달, 툴팁
  - `--radius-lg`: **8px** — 큰 모달, 커맨드 팔레트
  - `--radius-full`: **9999px** — 아바타만. 그 외 절대 금지.
  - **중요**: `rounded-xl` 같은 획일적 둥글림 금지. radius는 의미를 가질 때만 존재한다.
- **그림자**: 기본적으로 **사용하지 않음**. 분리는 헤어라인(`--border`)과 여백으로. 예외: 커맨드 팔레트·모달의 backdrop blur + 작은 shadow (`box-shadow: 0 8px 24px rgba(20,18,16,0.08)`).

---

## 모션

- **접근 방식**: Minimal-functional
- **Easing**:
  - Enter: `cubic-bezier(0, 0, 0.2, 1)` (ease-out)
  - Exit: `cubic-bezier(0.4, 0, 1, 1)` (ease-in)
  - Move: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out)
- **Duration**:
  - `duration-micro`: **80ms** (hover, focus)
  - `duration-short`: **150ms** (버튼·토글 상태 변화)
  - `duration-medium`: **250ms** (카드 입장, 사이드바 접힘)
  - `duration-long`: **400ms** (페이지 전환)
- **시그니처 모션**: **Ink-bleed**
  - 트리거: 할 일 완료, 문서 아카이브, 주간보고 제출
  - 효과: 텍스트 아래쪽에 단청 레드 1.5px 밑줄이 왼→오로 300ms ease-in-out 채워짐. 끝나면 줄 그어진 텍스트 + 붉은 선.
  - CSS 예시:
    ```css
    .ink-bleed {
      background: linear-gradient(to right, var(--accent), var(--accent)) no-repeat left bottom;
      background-size: 0% 1.5px;
      transition: background-size 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ink-bleed[data-done="true"] {
      background-size: 100% 1.5px;
      text-decoration: line-through;
      text-decoration-color: var(--accent);
      color: var(--muted);
    }
    ```
- **금지**: bounce, spring, scale 큰 entrance animation, staggered reveal on load, parallax. 사용자는 앱이 빨리 열리길 원한다.
- **접근성**: `prefers-reduced-motion: reduce` 시 모든 transition을 80ms로 축소, ink-bleed는 즉시 적용.

---

## 아이코노그래피

- **아이콘 세트**: Lucide (이미 설치됨). stroke-width **1.5px**, 크기 16 / 20 / 24.
- **원칙**:
  - 색상 원형 안에 아이콘 넣지 말 것 (AI slop). 아이콘은 bare하게.
  - 내비게이션은 **텍스트 중심**, 아이콘은 보조. 사이드바는 텍스트 레이블이 주.
  - 상태 아이콘은 semantic color만 사용 (success / warn / danger).
- **브랜드 seal**: 12×12px 붉은 정사각형 + 음각 `印` 또는 `흐` — 헤더, 발표 슬라이드 우하단, 아카이브 항목에 드물게.

---

## 데이터 시각화

- **색상**: Grayscale ramp + 단청 레드 한 포인트. 여러 색 범례(legend) 대신 **소형 배수 차트(small multiples)** 사용.
- **타이포**: IBM Plex Sans KR, `tabular-nums`, 소수점은 `muted` 색으로 축소 표시 (예: `87`**`.3%`** → 정수는 크게, 소수는 작게).
- **금지**: pie chart (편집적이지 않음), 무지개 범례, gradient fill.

---

## 안티-슬롭 선언 (Never)

1. 보라색/바이올렛 그라디언트 절대 금지 (Reflect식 AI blob 금지).
2. 3칸 아이콘 feature 그리드 금지.
3. 모든 요소에 획일적인 `rounded-xl` 금지. radius는 의미를 가질 때만.
4. 순흑(`#000`), 순백(`#FFF`), 순회색 금지. 항상 warm-shifted.
5. 중앙정렬 heavy hero 금지. 에디토리얼은 비대칭.
6. Inter / Roboto / Arial / Helvetica / Open Sans / Poppins / Raleway / Clash Display 금지.
7. 아이콘을 색상 원 안에 넣지 말 것.
8. 단청 레드를 "주목을 끌기 위해" 남용하지 말 것. seal처럼 드물게.
9. `shadow-md`, `shadow-lg` 등 SaaS-neutral 그림자 대신 헤어라인 사용.
10. entrance animation, staggered reveal, bounce 등 "demo용" 모션 금지.

---

## 구현 체크리스트 (단계별)

### Stage 1: Tokens (우선)
- [ ] `app/globals.css`의 CSS variables를 Hanji/Sumuk 팔레트로 교체
- [ ] `tailwind.config.ts`에 semantic tokens 매핑 (`bg`, `surface`, `ink`, `muted`, `accent`)
- [ ] 폰트 로딩 (`app/layout.tsx` 또는 `head`에 link 추가)
- [ ] 다크모드 토글 메커니즘 (localStorage + `data-theme` 속성)

### Stage 2: Primitives
- [ ] Button (primary · secondary · ghost · danger — 모두 radius 2px)
- [ ] Input (underline-only, no box)
- [ ] Card (hairline 1px, no shadow)
- [ ] Tag (uppercase, mono, bordered)
- [ ] Alert (left-border semantic, surface-2 bg)
- [ ] Kbd (커맨드 힌트)

### Stage 3: App surfaces
- [ ] Sidebar — 텍스트 중심, 활성 항목에 accent 좌측 보더
- [ ] Today 페이지 — broadsheet masthead + 이열 구성
- [ ] Kanban — 그림자 없는 index-card 카드, 헤어라인 세로 구분
- [ ] Markdown presenter — hanji 풀블리드, 96px Paperlogy 타이틀, 단청 레드 4px 룰
- [ ] Settings — 목차 페이지 레이아웃 (사이드바 토글 리스트 금지)

### Stage 4: Signature
- [ ] Ink-bleed 완료 애니메이션
- [ ] Seal stamp (주간보고 완료, 아카이브 항목)
- [ ] 커맨드 팔레트 (⌘K)

---

## 결정 로그

| 날짜 | 결정 | 근거 |
|---|---|---|
| 2026-04-15 | 디자인 시스템 v0.1 "한지와 먹" 채택 | `/design-consultation` 세션에서 에디토리얼 뉴스프린트 방향으로 합의. 사용자의 마크다운-파일-중심 철학을 표현. 경쟁군(Notion·Linear·shadcn generic)과 명확히 차별화. |
| 2026-04-15 | Paperlogy + Pretendard + IBM Plex 계열로 결정 | Korean-first 원칙. Inter/Roboto 등 generic SaaS 서체 전면 배제. Paperlogy는 한국 신문 DNA, Pretendard는 한/영 혼용 최적, IBM Plex는 data density. |
| 2026-04-15 | 단일 단청 레드 `#C9452B` accent 채택 | 한국 전통 건축 채색의 주단(朱丹)에서. 여러 색 대신 한 색을 드물게 — seal의 의미. |
| 2026-04-15 | 그림자 대신 헤어라인, 균일 둥근 모서리 배제 | "파일 우선" 철학을 에디토리얼 문법으로 표현. shadcn generic 카드 본능 억제. |

---

*Design System v0.1 · 생성: /design-consultation · 2026-04-15 · CLT Digital Team*
