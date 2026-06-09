# FlowDesk

> 업무의 흐름을 한 곳에서 — 통합 워크스페이스 데스크톱 앱

FlowDesk는 **로컬 마크다운 파일**을 단일 진실 공급원(SSOT)으로 삼는 **local-first 데스크톱 앱**입니다. 문서·할 일·회의록·작업·발표자료·주간 보고서를 한 화면에서 다루고, 외부 에디터로 파일을 바꿔도 화면이 자동으로 갱신됩니다. Windows용 Electron 앱으로 배포되며 **자동 업데이트**를 지원합니다.

데이터는 전적으로 사용자가 지정한 **워크스페이스 폴더**의 마크다운 파일로 보관됩니다. 별도 서버·계정·클라우드가 필요 없습니다.

---

## 주요 기능

| 메뉴 | 설명 |
|------|------|
| **작업 현황** | 오늘 할 일·진행 작업·최근 변경을 모은 대시보드 |
| **오늘 / 모든 할 일** | `TODO.md` 기반 칸반 — 우선순위·카테고리·마감·완료 아카이브 |
| **프로젝트** | 프로젝트별 계획(plan) 문서 관리 |
| **작업 · 문서** | Milkdown 위지윅 에디터로 마크다운 문서 작성/편집 |
| **아이디어** | 아이디어 보드(`IDEAS.md`) |
| **회의록** | 회의록 작성·조회, 연/월 자동 분류 |
| **발표자료** | 마크다운 → 풀스크린 프레젠테이션, HTML 발표자료 서빙 |
| **주간 보고서** | `work-logs/<연>/<월>/week-N.md` 주간 리포트 |
| **뷰어** | 임의 마크다운 파일을 한지·먹 미감으로 렌더링 |

- **실시간 동기화** — 워크스페이스 파일이 외부에서 바뀌면(예: 다른 에디터, git pull) 화면이 자동 갱신(파일 워칭 + SSE).
- **Mermaid 다이어그램**, GFM, 코드 하이라이트, 봉인(印) 스탬프 등 에디토리얼 렌더링.

---

## 설치 (사용자)

1. [Releases](https://github.com/kimt86/flowdesk/releases/latest)에서 `FlowDesk-x.y.z-Setup.exe` 다운로드 후 실행.
2. 첫 실행 시 **워크스페이스 폴더**를 선택합니다(문서·할 일 등이 저장될 폴더). 선택은 저장되어 다음 실행 시 복원됩니다.
3. 이후 새 버전이 나오면 앱이 시작 시 **자동으로 감지·다운로드·적용**합니다 — 다시 설치할 필요 없습니다.

> 미서명 빌드라 첫 실행 시 Windows SmartScreen 경고가 나올 수 있습니다(추가 정보 → 실행). 메뉴 **FlowDesk › 업데이트 확인…**으로 수동 확인도 가능합니다.

---

## 개발

```bash
# 1) 의존성 설치
npm install

# 2) 워크스페이스 경로 설정 (.env.example 참고)
#    .env.local 에 작성:
#    WORKSPACE_ROOT=C:\path\to\your\workspace

# 3) 웹 개발 서버 (http://localhost:3000)
npm run dev
```

### 데스크톱 빌드/실행

```bash
npm run desktop:build   # next build(standalone) + 정적 자산 복사
npm run desktop:start   # 빌드본으로 Electron 실행
npm run desktop:dir     # 미설치 패키지(dist-desktop/win-unpacked)
npm run desktop:pack    # NSIS 인스톨러 생성
npm run desktop:icon    # 브랜드 아이콘 재생성(순수 Node)
```

### 새 버전 배포 (자동 업데이트 피드)

```bash
# 1) package.json version 올림 (예: 0.1.1 → 0.1.2)
# 2) GitHub 토큰
$env:GH_TOKEN = (gh auth token)
# 3) 빌드 + GitHub Release 게시 (latest.yml + Setup.exe + blockmap)
npm run desktop:release
```

게시되면 기존 설치본들이 다음 실행 때 자동 업데이트됩니다.

---

## 워크스페이스 구조

`WORKSPACE_ROOT` 아래의 마크다운 파일이 곧 데이터입니다.

```text
<workspace>/
├─ docs/                  # 문서 (프로젝트별 하위 폴더 + plans/)
├─ todo/
│  ├─ TODO.md             # 할 일 (오늘/전체 공용)
│  └─ archive/            # 완료 아카이브
├─ work/                  # 작업 문서
├─ work-logs/<연>/<월>/   # 주간 보고서 (week-N.md)
├─ meetings/<연>/<월>/    # 회의록
├─ presentations/         # 발표자료 (.md / .html)
├─ IDEAS.md               # 아이디어 보드
├─ PROJECTS.md            # 프로젝트 목록
└─ .fonts/                # (선택) 커스텀 폰트 — 아래 "폰트" 참고
```

---

## 아키텍처

- **프론트엔드** — Next.js 13.5 (App Router) + React 18, Tailwind, Radix UI, [Milkdown](https://milkdown.dev) 에디터, Mermaid.
- **데이터 계층** — Node `fs`로 워크스페이스 마크다운을 직접 읽고 씀(`lib/*`). frontmatter는 gray-matter, 렌더는 remark/rehype.
- **실시간 갱신** — `chokidar` 파일 워칭 → SSE(`/api/file-watch`) → 클라이언트 `router.refresh()`. 서버 부팅 시 `instrumentation.ts`로 워처 자동 기동.
- **데스크톱 셸** — Electron이 Next **standalone 서버**를 자식 프로세스로 fork하고 `127.0.0.1`만 바인딩(loopback). `nodeIntegration:false`·`contextIsolation`·`sandbox`로 하드닝. 트레이 상주, OS 알림, 로그인 자동 시작, 무재시작 워크스페이스 전환 지원.
- **패키징/업데이트** — electron-builder(NSIS) + electron-updater(GitHub Releases). 자세한 설계·검증·결정은 **[DESKTOP.md](DESKTOP.md)** 참고.

---

## 폰트

런타임 CDN 없이 전부 **오프라인 self-host**합니다:

- **본문/UI** — Pretendard, IBM Plex Sans KR/Mono, JetBrains Mono, Noto Serif KR(`next/font`), Paperlogy(로컬 `@font-face`). 모두 무료(OFL 등).
- **커스텀 한글 폰트(`aa_*`)** — 라이선스상 **저장소·배포 패키지에 미포함**. 대신 앱이 `<WORKSPACE_ROOT>/.fonts/aa_*.ttf`를 `/api/fonts` 라우트로 서빙합니다.
  - 워크스페이스 `.fonts/`에 폰트가 있으면 그걸로 렌더, 없으면 Pretendard/Paperlogy로 **자동 폴백**.
  - 앱 번들 밖에 있으므로 **자동 업데이트가 앱을 교체해도 폰트는 유지**됩니다.

---

## 디자인 시스템

방향은 **"한지와 먹 · Hanji + Ink"** — 에디토리얼 뉴스프린트 미감, 단청 레드 단일 accent, 헤어라인 기반, 그림자·순회색 금지. 모든 시각 작업은 **[DESIGN.md](DESIGN.md)**를 기준으로 합니다.

---

## 문서

- **[DESKTOP.md](DESKTOP.md)** — 데스크톱 전환 계획·아키텍처·리스크·진행 로그
- **[DESIGN.md](DESIGN.md)** — 디자인 시스템 전체 명세
- **[CLAUDE.md](CLAUDE.md)** — 프로젝트 작업 규칙

---

© kimt86
