# FlowDesk 데스크톱 전환 계획

> FlowDesk(Next.js 13.5 App Router, local-first 마크다운 워크스페이스)를 Windows 데스크톱 앱으로 전환하기 위한 계획 문서.
> 17개 에이전트가 코드를 직접 검증해 도출. 최종 갱신: 2026-06-09.

---

## 1. 현재 구조 진단

FlowDesk는 이미 **local-first 앱**이다 — 서버가 사용자 디스크의 마크다운을 직접 읽고 쓴다. 데스크톱 전환에 이상적이지만, "Node 단일 프로세스 HTTP 서버"를 깊게 전제하고 있어 그 전제를 깨는 전환(static export)은 데이터 계층 전면 재작성이 된다.

| 계층 | 내용 | 데스크톱 영향 |
|---|---|---|
| 데이터 | `lib/`의 11개 도메인 모듈이 `fs`로 `WORKSPACE_ROOT` 하위 마크다운 CRUD | Node 유지 시 거의 무수정 |
| DB | `lib/db/client.ts` — `@libsql/client` SQLite, todos 캐시 | **제거 확정** (§3 참조) |
| 경로 | `lib/paths.ts` — `WORKSPACE_ROOT`·DB 경로가 `process.cwd()` 기반 | 치명적 — 패키징 시 깨짐 |
| 파일 감시 | `lib/file-watcher.ts` chokidar → SSE | 동작하나 부팅 초기화로 재배치 |
| 실시간 갱신 | `app/api/file-watch/route.ts` SSE → `components/file-change-listener.tsx` `router.refresh()` | HTTP 서버 유지 시 동작 |
| 렌더링 | 14개 `page.tsx`가 `force-dynamic` RSC로 직접 fs 읽기, 클라 fetch 41곳 | static export를 불가능하게 만드는 핵심 |

핵심: **읽기는 대부분 RSC 직접 호출, 쓰기만 API fetch.** 이 이중 구조 때문에 정적 빌드 강등 접근(B/D)은 전면 재작성을 강제한다.

---

## 2. 추천 아키텍처: 접근 A — Electron + Next.js standalone 임베드 서버

Electron 메인 프로세스가 Next standalone 서버(`server.js`)를 자식 프로세스로 fork하고, BrowserWindow가 `http://127.0.0.1:<port>`를 로드. `lib/*`·SSE·chokidar·RSC·revalidatePath를 사실상 무수정 재사용.

### 점수 (높을수록 좋음; bundleSize는 가벼울수록 높음)

| 접근 | 공수↓ | 코드재사용 | 번들경량 | 네이티브UX | 유지보수 | 합계 |
|---|---|---|---|---|---|---|
| **A. Electron + Next standalone 임베드** | 8 | 10 | 4 | 7 | 8 | **37 ✅** |
| C. Tauri + Node 사이드카 | 7 | 10 | 5 | 7 | 6 | 35 |
| B. Electron + static export + IPC | 3 | 5 | 6 | 9 | 6 | 29 |
| D. Tauri + Rust 풀 포팅 | 1 | 3 | 10 | 10 | 4 | 28 |

### 채택 이유
- 공수 최저(4~6주). 데이터 계층 무수정 재사용 → `globalThis` 싱글톤 캐시 가정이 단일 임베드 서버에서 오히려 정확히 성립.
- Windows 우선에 유리: `win32-x64-msvc` libsql 바인딩 기설치(단 §3로 제거 예정), fsevents 부재, chokidar 5는 순수 ESM이라 네이티브 빌드 부담 없음.
- C는 Node 런타임 동봉(~50–90MB) + Rust 학습비용으로 ROI 낮음. D는 `todo-parser.ts` 한국어 regex·라인 규약과 `markdown.ts` 커스텀 플러그인을 Rust로 재현해야 해 사용자 실파일(TODO.md=SSOT) 손상 회귀가 가장 큼.
- 유일한 트레이드오프: 번들 최대 무게(~150–220MB).

---

## 3. libsql/SQLite DB 제거 (확정 — 추적 완료)

**결론: todos용 libsql DB는 읽는 곳이 0곳인 write-only 미러. 제거 시 동작 변화 0, 최대 패키징 리스크 소거.**

근거:
- DB 읽기 함수 `getAllTodosFromDb`·`getSyncMeta`·`setSyncMeta` — 정의만 있고 호출처 0.
- 유일한 쓰기 `syncTodosFromFile()`는 파일에서 읽어 DB에 쓰지만 **반환값은 파일 파싱 결과**(DB 미조회).
- 모든 호출처(todos GET/POST/PATCH/DELETE)가 그 파일 데이터를 사용. 화면 렌더(`app/page.tsx`, `app/todos/page.tsx`)는 `readTodos()`로 파일 직접 읽기.
- `drizzle-orm` 런타임 import 0, `TodoRow` 미사용.

제거 대상: `lib/db/client.ts`, `lib/db/schema.ts`, `lib/sync.ts`, `flowdesk.db`, deps `@libsql/client`·`drizzle-orm`·`drizzle-kit`. todos 라우트는 `syncTodosFromFile()` → `readTodos()` 직접 호출로 치환, `startFileWatcher()`(DB 재동기화 전용) 제거.

> 참고: `startFileWatcher`는 todo.md 변경 시 DB만 재동기화했고 SSE 이벤트를 쏘지 않았으므로, 제거해도 UI 동작 변화 없음. 외부 편집 TODO.md의 라이브 갱신을 원하면 추후 `lib/file-watcher.ts`에 `todo/` 디렉토리를 추가(별도 개선).

---

## 4. 단계별 마이그레이션 계획

| 단계 | 목표 | 핵심 작업 | 공수 | 상태 |
|---|---|---|---|---|
| **Phase 0a — libsql 제거** | 최대 패키징 리스크 선제거 | DB 레이어 삭제, todos 라우트를 `readTodos()` 직결, deps 정리 | 0.5일 | ✅ 완료 |
| **Phase 0b — PoC** | standalone 빌드 + Electron fork가 패키징 후 동작하는지 증명 | `output:'standalone'` 빌드 → Electron main(free-port + fork + 헬스폴링) → standalone 부팅 HTTP 200 검증 | 1주 | ✅ 완료 |
| **Phase 1 — 치명 경로 버그** | `process.cwd()` 의존 제거 | `WORKSPACE_ROOT`를 Electron main이 fork env로 주입, 첫 실행 폴더 다이얼로그 + `userData/flowdesk-settings.json` 영속화 | 0.5주 | ✅ 완료 |
| **Phase 2 — 오프라인 폰트** | CDN 폰트 self-host | Google 4종 `next/font/google`(빌드 self-host) + Pretendard·Paperlogy `public/fonts` 로컬 `@font-face`. 런타임 CDN 참조 0 검증 | 0.5주 | ✅ 완료 |
| **Phase 3 — 워처 부팅 초기화** | SSE lazy-init 잠복 버그 제거 | `instrumentation.ts`로 서버 부팅 시 `fileWatcher.start()`+`registerCacheInvalidator()` 명시 호출 | 0.5주 | ✅ 완료 |
| **Phase 4 — 라이프사이클·창·보안** | 자식 서버 수명관리 + DESIGN.md chrome + Electron 보안 하드닝 | 좀비 방지(before-quit kill)·단일인스턴스·스플래시·`titleBarStyle:hidden`+overlay+드래그영역·`nodeIntegration:false/contextIsolation/sandbox`·setWindowOpenHandler(발표 격리 창)·powerMonitor→SSE 재연결 | 1~1.5주 | ✅ 완료 |
| **Phase 5 — 패키징·서명·배포** | NSIS 인스톨러 + 코드서명 | electron-builder NSIS 빌드(`FlowDesk-<ver>-Setup.exe`), afterPack 훅으로 standalone node_modules 복사. 서명·CI는 인증서 확보 후 | 1.5~2주 | ✅ 인스톨러 빌드(서명/CI 제외) |
| **Phase 5b — 자동 업데이트** | electron-updater + GitHub Releases | `main.js` autoUpdater(부팅/6h 체크·자동 다운로드·재시작 적용), 메뉴 '업데이트 확인', `publish: github(kimt86/flowdesk)`, `desktop:release` 스크립트 | 0.5주 | ✅ 코드/설정 완료 (저장소 생성+첫 릴리스 게시 필요) |
| **Phase 6 (선택) — 네이티브 확장** | 무재시작 워크스페이스 전환, 트레이 상주 + OS 알림, 자동 시작, viewer | 트레이/알림/자동시작/무재시작 전환 구현. viewer는 Electron에서 FSA 동작(현행 유지) | 2~3주 | ✅ 대부분 구현 |

**1차 출시(Phase 0~5) ≈ 5~7주.** libsql 제거로 Phase 0b의 가장 큰 미지수가 사라져 PoC 난이도 하락.

### ✅ Phase 0b 선행 블로커 해결됨: `next build` mermaid/Terser 실패

**증상**: `next build`가 `159.js from Terser — Expression expected`로 실패(mermaid 11.14 ESM 번들을 Terser minify가 파싱 실패). standalone on/off·libsql 제거와 무관하게 재현 → 새로 추가된 mermaid 통합(WIP)이 원인.

**해결**: `next.config.mjs`에 `transpilePackages: ["mermaid"]` 추가 → mermaid를 Next SWC 파이프라인으로 transpile해 Terser 호환 문법으로 낮춤. 동시에 발견된 부수 lint 에러(`components/today/today-board.tsx:240` 따옴표 미이스케이프) `&quot;`로 수정.

**검증 결과**:
- `npm run build` → `✓ Compiled successfully`, 42개 페이지 생성, `EXIT=0`
- `.next/standalone/server.js` 생성, chokidar 자동 트레이싱됨(수동 복사 불필요), mermaid는 서버 번들에 없음(클라 전용), libsql 완전 부재
- standalone 서버 부팅 스모크 테스트: `WORKSPACE_ROOT` env 주입 후 `GET /` → HTTP 200(44KB HTML), `GET /api/todos` → HTTP 200. **Phase 1의 env 주입 메커니즘이 실증됨.**
- 잔여 작업: standalone은 `.next/static`·`public`을 자동 복사하지 않음 → postbuild 복사 스텝 필요(Phase 0b).

---

## 5. 리스크 레지스터 (적대적 검증 완료, 8건)

| 심각도 | 리스크 | 완화책 | 대응 단계 |
|---|---|---|---|
| 🔴 Blocker | `process.cwd()` 기반 DB·워크스페이스 경로가 패키징 앱에서 깨짐 | env 주입 + fork 시 `cwd` 고정 | Phase 1 |
| 🟠 High | libsql `.node`가 Electron asar에서 dlopen 실패 | **§3 제거로 소거** | Phase 0a |
| 🟠 High | Next standalone nft가 동적 require(libsql/chokidar) 트레이싱 못 함 | `serverComponentsExternalPackages` + 빌드 후 복사 검증 (libsql 제거로 chokidar만 남음) | Phase 0b |
| 🟠 High | 외부 HTML serve(presentations) raw 반환 → Electron 코드실행 표면, 무인증 localhost API 노출 | `nodeIntegration:false`+`contextIsolation:true`+`sandbox:true`, 발표 격리 창, HOST loopback 고정, CSP 헤더 | Phase 4 |
| 🟠 High | CDN 폰트 오프라인 폴백 추락 → DESIGN.md 정체성 소실 | self-host | Phase 2 |
| 🟡 Medium | standalone 포트 충돌 + 부팅-로드 레이스(흰 화면) | OS 빈 포트 주입 + listen 폴링 후 `loadURL` | Phase 0b |
| 🟡 Medium | SSE 재연결/슬립·다중창 생명주기 무처리 → 좀비 EventSource | `es.onerror`/`onopen`, `powerMonitor`, 종료 시 tree-kill | Phase 4 |
| 🟡 Medium | chokidar Windows 신뢰성(OneDrive/네트워크 드라이브 이벤트 누락) | `CHOKIDAR_USEPOLLING` env 게이트, 폴더 선생성 | Phase 1/3 |

> chokidar 5는 순수 ESM·네이티브 0개 → "fsevents asarUnpack" 통념은 이 저장소에 해당 없음. libsql 제거 후 네이티브 함정은 사실상 0.

---

## 6. 시작 전 결정 사항

1. **배포 대상**: Windows 단독인가, macOS/Linux 포함인가? (단독이면 패키징 직선적)
2. ~~libsql 제거 가능 여부~~ → **확정 제거** (§3).
3. **코드서명 인증서**: Azure Trusted Signing(저비용) / EV(즉시 SmartScreen 통과) / 사내 신뢰 등록 중?
4. **워크스페이스 변경**을 1차에서 "앱 재시작 기반"으로 허용? (무재시작 필수면 `lib/paths.ts` 함수형 리팩터를 1차로 당김)
5. **발표 모드**(`app/(present)`)를 별도 전체화면 창으로 분리?
6. `app/viewer`(브라우저 FSA 기반)·prompt-builder(`/api/prompt` 데드 참조) 유지/폐기?

---

## 7. 진행 로그

- **2026-06-09**: 멀티에이전트 분석 완료. 접근 A 채택. libsql DB 제거 가능 확정(write-only 미러, 읽기 0).
- **2026-06-09**: **Phase 0a 완료** — `lib/db/`·`lib/sync.ts`·`flowdesk.db` 삭제, todos 라우트(`GET/POST`·`[id]`)를 `readTodos()` 직결로 치환, `@libsql/client`·`drizzle-orm`·`drizzle-kit` 제거(npm 38패키지 prune), `.gitignore` 정리. `tsc --noEmit` 통과(에러 0).
- **2026-06-09**: Phase 0b 착수 시도 중 **선행 블로커 발견** — `next build`가 mermaid/Terser 단계에서 실패(§4). standalone on/off 모두 동일 재현으로 내 변경과 무관함 확인.
- **2026-06-09**: **mermaid 블로커 해결** — `transpilePackages:["mermaid"]` + lint 수정(`today-board.tsx:240`). `next build` 통과(42페이지). **standalone PoC 검증 완료**: `server.js` 생성·chokidar 트레이싱·libsql 부재 확인, 서버 부팅 후 `GET /`·`GET /api/todos` 모두 HTTP 200, `WORKSPACE_ROOT` env 주입 동작.
- **2026-06-09**: **Phase 0b·1·3·4 구현 완료** — `electron/main.js`(free-port·fork·헬스폴링·단일인스턴스·스플래시·titleBarOverlay·보안 하드닝·setWindowOpenHandler·powerMonitor·lifecycle kill), `electron/preload.js`(contextBridge 최소 API), `instrumentation.ts`(워처 부팅 초기화), `scripts/copy-standalone.mjs`(postbuild static 복사), `electron-builder.yml`, `package.json`(main + desktop:* 스크립트). 부팅 스모크로 instrumentation 워처 기동 로그 확인.
- **2026-06-09**: **Phase 2 완료** — Google 4종 `next/font/google` self-host(447 woff2), Pretendard·Paperlogy `public/fonts` 로컬 `@font-face`. layout.tsx CDN `<link>` 제거, globals.css 스택에 변수 prepend. 빌드 CSS/HTML에 CDN 참조 0 검증.
- **2026-06-09**: **Phase 4 완료** — `components/file-change-listener.tsx` SSE 견고화(onopen refresh·onerror 재연결·visibilitychange·Electron resume 신호 구독), `components/sidebar.tsx`+globals.css 드래그 영역(`.app-drag`/no-drag).
- **2026-06-09**: **Phase 5 완료** — `electron-builder --win nsis`로 `FlowDesk-0.1.0-Setup.exe`(171MB) 생성. 패키징 버그 발견·수정: electron-builder 글로벌 `!**/node_modules/**` 필터가 standalone의 traced node_modules를 제외 → `scripts/after-pack.js` 훅으로 직접 복사. **패키징된 standalone 서버 부팅 검증: `GET /`·`GET /api/todos` HTTP 200**(chokidar·next·react 해결 확인). 미해결: 코드서명·자동업데이트·아이콘·asar 크기 최적화(§8 남은 작업).
- **2026-06-09**: **데스크톱 전환 1차(Phase 0~5) 완료.** 웹앱 → Windows 데스크톱 앱 전환 — 빌드·standalone 부팅·패키징 모두 코드 실행으로 검증.
- **2026-06-09**: 패키징 버그 수정 — `afterPack` 훅으로 standalone node_modules 복사. **패키징된 `FlowDesk.exe` 헤드리스 스모크 검증**: 실제 Electron 런타임에서 메인→서버 fork→`HTTP/1.1 200 OK`. (이 셸 환경의 `ELECTRON_RUN_AS_NODE=1`로 초기 스모크 실패 → 명시적 해제 후 성공. 사용자 더블클릭 시 정상.)
- **2026-06-09**: **Phase 6 구현** — 무재시작 워크스페이스 전환(서버 재기동+리로드), 트레이 상주, OS 알림(백그라운드 파일 변경), 로그인 자동 시작, 브랜드 아이콘(순수 Node 생성). viewer는 Electron FSA 동작으로 현행 유지. asar 크기 최적화는 웹배포 방침 보존 위해 의도적 보류(결정 문서화).

---

## 8. 데스크톱 빌드·실행 방법

### 신규/변경 파일
- `electron/main.js` — Electron 메인 프로세스(서버 fork·창·보안·lifecycle)
- `electron/preload.js` — contextBridge 최소 API(`window.flowdesk`: 워크스페이스/알림/재연결)
- `electron/icon.png`·`electron/tray.png` — 런타임 창/트레이 아이콘(asar 번들)
- `instrumentation.ts` — 서버 부팅 시 file-watcher 초기화
- `scripts/copy-standalone.mjs` — standalone에 `.next/static`·`public` 복사
- `scripts/after-pack.js` — 패키징 후 standalone node_modules 복사(electron-builder 필터 우회)
- `scripts/gen-icon.mjs` — 순수 Node 브랜드 아이콘 생성(`npm run desktop:icon`)
- `electron-builder.yml` — Windows NSIS 패키징 설정(afterPack·icon·extraResources)
- `build-resources/icon.png` — 빌드 타임 앱 아이콘(→ .ico)
- `public/fonts/` — Pretendard·Paperlogy self-host woff2
- `next.config.mjs` — `output:standalone` + `transpilePackages:[mermaid]` + `instrumentationHook`
- `package.json` — `main:electron/main.js` + `desktop:*` 스크립트

### 명령어
```bash
# 개발(웹) — 기존과 동일
npm run dev

# 데스크톱 빌드(standalone + static 복사)
npm run desktop:build

# 빌드된 산출물로 Electron 실행(패키징 없이 로컬 확인)
npm run desktop:start

# 미설치 패키지(빠른 검증, dist-desktop/win-unpacked/)
npm run desktop:dir

# NSIS 인스톨러 생성(dist-desktop/FlowDesk-<ver>-Setup.exe)
npm run desktop:pack
```

### 런타임 동작
1. 첫 실행 시 워크스페이스 폴더 선택 다이얼로그 → `%APPDATA%/FlowDesk/flowdesk-settings.json`에 저장.
2. 메인이 빈 포트를 잡아 standalone Next 서버를 `127.0.0.1`에 fork(`WORKSPACE_ROOT` env 주입).
3. 헬스폴링 후 BrowserWindow가 localhost 로드, 스플래시 → 메인 창 전환.
4. 종료 시 자식 서버 kill(좀비/포트 누수 방지).
5. (패키지) 시작 시 + 6시간마다 GitHub Releases에서 새 버전 확인 → 백그라운드 다운로드 → "지금 재시작" 안내(또는 다음 종료 시 자동 적용). 메뉴 'FlowDesk › 업데이트 확인…'으로 수동 확인.

### 자동 업데이트 릴리스 방법 (electron-updater + GitHub Releases)

피드: `kimt86/flowdesk` GitHub Releases (electron-builder.yml `publish`). 설치된 앱은 이 저장소의 최신 release를 확인한다.

**선행 1회**: GitHub에 `kimt86/flowdesk` 저장소 생성(비공개 권장 — 비공개 release 자산도 electron-updater가 받을 수 있으나, 비공개는 다운로드에 토큰 필요. 사내 배포면 공개 저장소+비공개 코드 분리 또는 generic 피드 고려).

**새 버전 릴리스**:
1. `package.json`의 `version` 올림 (예: 0.1.0 → 0.1.1). electron-updater는 **버전이 높을 때만** 업데이트.
2. `GH_TOKEN` 설정 (repo 권한 PAT): `$env:GH_TOKEN = (gh auth token)`.
3. `npm run desktop:release` → 빌드 후 `latest.yml` + `FlowDesk-x.y.z-Setup.exe` + `.blockmap`을 GitHub release(태그 `vx.y.z`)에 자동 업로드.
4. 기존 설치본들이 다음 실행/체크 시 새 버전을 감지·적용.

> 미서명 상태에서도 업데이트는 동작하나, Windows에서 새 설치본 실행 시 SmartScreen 경고가 날 수 있다(코드 서명으로 완화 — §6-3).

### Phase 6 구현 완료 항목
- **무재시작 워크스페이스 전환**: 폴더 변경 시 앱 재시작 없이 서버 child만 재기동 + 창 리로드(`changeWorkspaceFlow`). lib/paths.ts 상수가 새 프로세스에서 재평가되므로 15파일 리팩터 불필요 — fork 아키텍처 특성을 활용한 깔끔한 해법.
- **트레이 상주**: `Tray` + 컨텍스트 메뉴(열기/워크스페이스 변경/종료), 창 닫기 → 트레이로 숨김.
- **OS 알림**: 백그라운드(창 숨김) 시 외부 파일 변경을 네이티브 `Notification`으로 라우팅(preload `notify` + `file-change-listener` 분기).
- **로그인 시 자동 시작**: 앱 메뉴 체크박스(`app.setLoginItemSettings`).
- **앱 아이콘**: 외부 도구 없이 순수 Node(`scripts/gen-icon.mjs`)로 단청 레드 인장 모티프 아이콘 생성 → `build-resources/icon.png`(electron-builder가 .ico 변환), `electron/icon.png`·`tray.png`(런타임).
- **viewer**: 브라우저 File System Access API는 Electron(localhost=secure context)에서 동작하므로 현행 유지(네이티브 다이얼로그 전환은 선택).

### 자동 업데이트 & 배포 (적용 완료)
- **GitHub 저장소**: `kimt86/flowdesk` (공개). 소스 푸시 + Release로 배포.
- **자동 업데이트(Phase 5b)**: `electron-updater` + GitHub Releases 피드 적용. v0.1.0 릴리스 게시. 설치 앱이 시작 시·6시간마다 새 버전 감지·다운로드·적용. 새 버전 배포: `version` 올림 → `GH_TOKEN` 설정 → `npm run desktop:release`.
- **커스텀 폰트 정책(aa_)**: 라이선스상 비공개. `app/fonts/aa_*.ttf`·`public/fonts/aa_*.ttf`는 gitignore(저장소 제외), `copy-standalone`가 배포 패키지에서도 제외. globals.css `@font-face`로 로드되어 **로컬에 있으면 사용, 없으면 Pretendard/Paperlogy로 자동 폴백**. `npm run dev`는 로컬 폰트 그대로 사용.

### 결정 대기 / 환경 필요(미적용)
- **코드 서명**: `electron-builder.yml`에 서명 옵션 자리만 둠. 인증서(Azure Trusted Signing/EV/사내) 확보 시 활성화(§6-3). 미서명 시 SmartScreen 경고.
- **asar 크기 최적화(보류·결정 대기)**: `app.asar` ~160MB(electron-builder가 `dependencies`를 번들하나 **런타임 미사용** — 서버는 `resources/standalone/node_modules`로 동작). 인스톨러 ~50MB 절감 가능. 해소: 앱 deps를 `devDependencies`로 이동(웹 prod 배포 `--omit=dev` 안 쓰면 안전 — 현재 웹배포 인프라 없음 확인) 또는 two-package 구조. **웹배포 가능성(§6-1)을 보존하기 위해 의도적으로 보류** — 사용자 결정 후 적용 권장.
- **GUI 시각 실측**: 메인→서버 fork→HTTP 200은 패키징된 `FlowDesk.exe`로 **헤드리스 검증 완료**(스모크 `{ok:true, status:"HTTP/1.1 200 OK"}`). 단 **창 렌더·드래그·발표 창·트레이·알림의 시각/상호작용**은 디스플레이가 필요해 사용자 환경 실행으로 최종 확인 필요.
