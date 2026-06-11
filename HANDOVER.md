# FlowDesk — 작업 인계 문서 (HANDOVER)

> 이 파일은 **다른 환경(WSL)에서 Claude에게 처음 보여주고 작업을 이어가기 위한** 인계 문서입니다.
> 작성: 2026-06-11 / 작성 세션: Windows(네이티브). 프로젝트 언어·응답은 **한글**(코드/경로/기술용어는 영어).

---

## 0. 가장 먼저 읽을 것

- **이 프로젝트는 Windows 데스크톱 앱(Electron + Next.js standalone)이다.** AI 비서는 GitHub
  Copilot SDK가 동봉한 **`copilot.exe`(win32-x64 네이티브 바이너리)**를 spawn해 동작한다.
- ⚠️ **WSL(Linux)에서 이어갈 때 핵심 주의**: `copilot.exe`는 **Windows 전용**이라 WSL에서 직접
  실행되지 않는다. WSL에서 비서 추론까지 테스트하려면 `@github/copilot-linux-x64`(리눅스 바이너리)가
  필요하다. `npm install`을 WSL에서 다시 하면 플랫폼에 맞는 바이너리가 깔린다(현재 node_modules는
  Windows용). **데스크톱 패키징(`electron-builder --win`)은 Windows에서만** 의미가 있다. WSL에선
  **코드 작업 + dev 서버(`next dev`) + 리눅스 바이너리로 비서 검증**이 가능하다.
- 함께 읽을 문서: **`ASSISTANT.md`**(비서 전체 설계·Phase별 상세), **`DESIGN.md`**(디자인 시스템 —
  시각 작업 전 필수), **`CLAUDE.md`**(프로젝트 규칙).

---

## 1. 프로젝트 한 줄 요약

로컬 마크다운 파일이 SSOT인 개인 업무 OS(Next.js 13.5 App Router). Electron 데스크톱 앱으로 전환됨
(`electron/main.js`가 Next standalone 서버를 fork). 이번 세션에서 **AI 비서**(자연어로 할일·문서·
회의록 등을 조작)를 처음부터 끝까지 구현했다.

---

## 2. 이번 세션에서 한 일 (요약)

### A. AI 비서 구현 — Phase 0~5 (전부 완료·검증)

| Phase | 내용 | 핵심 산출물 |
|---|---|---|
| **0** | SDK 임베드/인증/tool/패키징 go-no-go 실측 | (검증만) win-unpacked 834MB |
| **1** | tool 레이어 42개 + provider + SSE 라우트 | `lib/assistant/*`, `app/api/assistant/route.ts` |
| **2** | 모델 선택 드롭다운 + 인증 상태 배너 | `app/api/assistant/models/route.ts`, 패널 |
| **3** | 우측 상주 패널 UI + 양방향 승인 + 스트리밍·중지·자동실행 | `components/assistant/assistant-panel.tsx`, `app/api/assistant/approve/route.ts` |
| **4** | 쓰기 안전장치(백업+원자적) + file-watcher 정합 | `lib/safe-write.ts`, `lib/file-watcher.ts` |
| **5** | device flow 인증(COPILOT_HOME 격리) | `electron/main.js`, `electron/preload.js` |

### B. 실사용 중 발견한 버그 수정 (4건)

1. **today 체크박스 상태** — 파서는 `[x~! ]` 4종(완료/미완료/진행중/보류) 인식, mutation은 `[x ]`
   2종만 → 진행중(`[~]`) 항목이 toggle/update/delete 안 됨. → `lib/today.ts` 정규식 통일.
2. **today add 헤더 형식** — `add_today_task`가 `## 오늘 할 일` 헤더를 엄격히 찾아, 이모지/h3/날짜
   헤더면 추가 실패. → 헤더 유연 매칭 + `#today` 항목 뒤 fallback.
3. **멀티턴 맥락 상실** — 매 요청 새 세션이라 "이거/방금 그거" 못 알아들음. → **대화 history를 매
   요청에 직접 주입**(`buildContextualPrompt`). `resumeSession`은 불안정해서 안 씀.
4. (위 1,2와 같은 계열) read 파서와 write mutation의 인식 범위 불일치가 근본 패턴.

### C. 잠재버그 선제 점검 (병렬 Agent 3그룹) → 수정

- **ideas.ts**: 멀티라인 content / 값에 `---`·콤마 → 손상. → **값 JSON 인코딩**(레거시 호환 디코드).
- **projects.ts**: `update_project`가 잘못된 rawContent(`##` 0개/2개)로 프로젝트 소실/분열, 제목에
  "archive" 들어가면 구분자 오인. → rawContent 헤딩 검증 + archive 경계 **정확 매칭**.
- **archive.ts**: 코드블록(```` ``` ````) 내 체크박스를 mutation이 오인. → `isInsideCodeBlock` 방어.
- **worklogs.ts**: 비표준 파일명은 목록에서 누락. → `createWorklogSafe`가 `week-<n>.md` 강제.
- ✅ 정합성 OK 확인: 경로(relPath) 슬래시/백슬래시, work 디렉터리 생성(safe-write가 mkdir).

### D. (세션 외 작업) Claude 스킬 정리

`~/.claude/skills/`의 직접 설치 스킬 46개(gstack/crew 등)를 `~/.claude/backups/removed-20260611-100514/`
로 **이동**(복구 가능). plugins(`claude-plugins-official` 공식 마켓 + `pdf-viewer-inline`)는 성격이
달라 **사용자 확인 대기 중**(아직 안 지움). → FlowDesk 코드와 무관.

---

## 3. 주요 결정과 근거

- **프로바이더 = GitHub Copilot SDK(`@github/copilot-sdk`)** 우선. Claude Agent SDK는 보류.
  근거: Copilot 구독으로 **claude-opus-4.8 포함 15개 모델** 사용 가능(실측). claude.exe(243MB) 동봉
  불필요. 기본 모델 **`claude-sonnet-4.6`**.
- **인증은 시스템 로그인에 의존하지 않고 device flow + `COPILOT_HOME` 격리**. `main.js`가
  `COPILOT_HOME=userData/copilot-home`을 fork env로 주입. "Copilot 연결하기" 버튼 → `copilot login`
  spawn → 코드/URL 중계. (현재 사용자는 `clt-tk` 계정 사용 의도 확인됨.)
- **패키징**: `copilot.exe`만 `extraResources`로 동봉(`@github/copilot` 로더/wasm 불필요 — 실측).
  electron-builder가 app.asar에 자동 포함하는 `@github/*` 중복은 `files: !node_modules/@github/**`로
  제거 → win-unpacked **834MB**.
- **tool 정합 원칙**: lib의 read(파서)와 write(mutation)는 **같은 형식/식별자 기준**을 써야 한다
  (이번 버그들의 근본 교훈). 모든 쓰기는 `lib/safe-write.ts`(백업 `.flowdesk-trash` + 원자적
  temp→rename)를 거친다.
- **승인 정책**: read=자동, write=자동실행 토글, **destructive=토글 무관 항상 승인**.
- **맥락**: 세션 복원 대신 history 직접 주입(최근 20턴, 토큰 보호).

---

## 4. 핵심 파일 맵

**비서 코어 (신규)**
- `lib/assistant/types.ts` — 공통 타입(ToolCategory, AssistantEvent, RunOptions, AssistantProvider)
- `lib/assistant/tools.ts` — **tool 42개**(zod 단일원본 + 핸들러 + read/write/destructive 분류)
- `lib/assistant/providers/copilot.ts` — CopilotProvider(copilot.exe spawn, defineTool 변환, 승인
  게이트, `buildContextualPrompt`)
- `lib/assistant/approvals.ts` — 승인 대기 pending Map
- `app/api/assistant/route.ts` — 메인 SSE 라우트(history 받음)
- `app/api/assistant/approve/route.ts` — 승인 회신
- `app/api/assistant/models/route.ts` — 모델 목록 + 인증 상태
- `app/api/assistant-spike/route.ts` — Phase 0 스파이크(정리/삭제 후보)
- `components/assistant/assistant-panel.tsx` — 우측 패널 UI(스트리밍·tool 타임라인·승인 모달·device
  flow 모달·모델 드롭다운·새 대화 버튼·자동실행 토글)

**lib 수정 (기존 파일)**
- `lib/today.ts` — 체크박스/헤더 버그 수정 + safe-write
- `lib/ideas.ts`, `lib/projects.ts` — round-trip/검증 수정 + safe-write
- `lib/archive.ts` — 코드블록 방어 + safe-write
- `lib/worklogs.ts` — week-N.md 강제 + create/write/delete 추가 + safe-write
- `lib/meetings.ts` — create/write/delete 추가(회의록 작성) + safe-write
- `lib/docs.ts`, `lib/work.ts` — safe-write 적용
- `lib/safe-write.ts` (신규) — 백업+원자적 쓰기
- `lib/file-watcher.ts`, `lib/cache-invalidator.ts`, `components/file-change-listener.tsx` —
  todo/projects 감시 추가(비서 쓰기 자동 새로고침 정합)
- `lib/paths.ts` — `TODO_DIR` 추가

**Electron / 빌드**
- `electron/main.js` — device flow(`connectCopilot`), `COPILOT_HOME`/`FLOWDESK_COPILOT_EXE` fork env,
  `copilotExePath()`/`copilotHome()`
- `electron/preload.js` — connectCopilot/cancelCopilotConnect/onCopilotLoginCode
- `next.config.mjs` — `serverComponentsExternalPackages`에 `@github/copilot-sdk`,`@github/copilot`
- `electron-builder.yml` — extraResources(copilot.exe) + `files: !node_modules/@github/**`
- `package.json` — `@github/copilot-sdk`, `zod`, `tsx`(dev) 추가

**문서/검증**
- `ASSISTANT.md` — 비서 전체 설계·Phase별 상세·실측 결과(가장 자세한 참고)
- `scripts/spike-*.mjs` — 검증 스크립트 11종(아래 §6)

---

## 5. 현재 상태

- **git**: `master` 브랜치, **전부 uncommitted**(아래 변경 목록). 아직 커밋 안 함.
- **빌드**: 마지막으로 `npm run desktop:dir` 성공(멀티턴 맥락까지 포함). `dist-desktop/win-unpacked/
  FlowDesk.exe`가 최신. 단 이건 Windows 산출물(WSL에선 재빌드 의미 없음).
- **타입체크**: `npx tsc --noEmit` 통과(exit 0).
- **변경 파일**(M=수정, ??=신규):
  - M: app/layout.tsx, components/file-change-listener.tsx, electron-builder.yml, electron/main.js,
    electron/preload.js, lib/{archive,cache-invalidator,docs,file-watcher,ideas,meetings,paths,
    projects,today,work,worklogs}.ts, next.config.mjs, package(-lock).json
  - ??: ASSISTANT.md, app/api/assistant-spike/, app/api/assistant/, components/assistant/,
    lib/assistant/, lib/safe-write.ts, scripts/spike-*.mjs

---

## 6. WSL에서 처음 할 일 (체크리스트)

1. **의존성 재설치**(플랫폼 바이너리 교체): `npm install` — WSL이면 `@github/copilot-linux-x64`가
   깔린다. `tsx`, `zod`, `@github/copilot-sdk`도 복원됨.
2. **타입체크**로 코드 무결성 확인: `npx tsc --noEmit`
3. **비서 로직 검증**(리눅스 바이너리 + 인증 필요): `scripts/spike-*.mjs`는 standalone 서버를 fork해
   라우트를 때린다. WSL에서 돌리려면 (a) `npm run desktop:build`로 standalone 생성, (b)
   `FLOWDESK_COPILOT_EXE`를 리눅스 copilot 바이너리 경로로, (c) Copilot 인증(`copilot login` 또는
   `COPILOT_GITHUB_TOKEN`)이 필요하다. 인증/바이너리 없으면 lib 단위 검증(`spike-roundtrip.mjs`,
   `spike-edge.mjs` — tsx로 lib 직접 호출, 네트워크 불필요)만으로도 today/ideas/projects/archive/
   worklog 로직은 확인 가능.
4. **dev 서버**: `next dev`로 UI 작업 가능(비서 라우트는 인증/바이너리 있어야 추론).

---

## 7. 남은 TODO

**바로 할 만한 것**
- [ ] **커밋 정리** — 변경이 매우 많다. 논리 단위 권장: ① 비서 코어(lib/assistant + api) ②
      패널/인증 UI ③ lib 버그수정·safe-write·file-watcher ④ Electron/빌드 설정 ⑤ ASSISTANT.md/
      검증스크립트. (아직 안 함. 사용자가 "정리되면 커밋" 의사 밝힘.)
- [ ] **스파이크 정리** — `app/api/assistant-spike/route.ts`와 `scripts/spike-*.mjs`는 검증용. 커밋
      전에 유지할지(회귀 검증) / `.gitignore` 처리할지 / 삭제할지 결정.
- [ ] **plugins 삭제 결정**(FlowDesk 외) — `~/.claude/plugins`의 공식 마켓 + pdf-viewer-inline을
      지울지, 백업 폴더(`removed-20260611-...`)를 완전 삭제할지 사용자 확인 대기.

**비서 개선 (추후/엣지)**
- [ ] archive 연속 mutation의 stale lineIndex 근본 해결(현재 코드블록 방어 + 비서 재조회 안내로 완화).
      내용 기반 안정 식별자로 바꾸는 게 정석.
- [ ] 토큰 예산/누적 캡(현재 tool_result 8000자 캡만). AbortController 중지는 구현됨.
- [ ] 미로그인 사용자 device flow 실제 기기 테스트(코드 파싱 정규식은 실측했으나 완주 인증은 미검증).
- [ ] (보류) Claude Agent SDK / API키 폴백 프로바이더 — 현재 Copilot 단일로 충분.

**실사용 회귀**
- [ ] 사용자가 데스크톱 앱에서 계속 테스트 중. read/write 정합 계열 버그가 또 나오면 "파서 기준에
      mutation을 맞춘다"는 동일 원칙으로 수정.

---

## 8. 검증 스크립트 색인 (`scripts/`)

- `spike-copilot.mjs` — SDK 임베드/인증/tool 스모크
- `spike-standalone.mjs` / `spike-packaged.mjs` — standalone·패키지에서 copilot.exe spawn
- `spike-assistant.mjs` — 멀티 tool 통합(할일+문서+회의록)
- `spike-approval.mjs` — 양방향 승인(write/destructive)
- `spike-final.mjs` — 모델 라우트 + 백업 생성
- `spike-toggle.mjs` — `[~]` 진행중 항목 완료처리
- `spike-add.mjs` — 다양한 헤더 형식에서 add
- `spike-roundtrip.mjs` — ideas/projects round-trip(**tsx로 lib 직접 호출, 네트워크 불필요**)
- `spike-edge.mjs` — archive 코드블록 방어 + worklog 파일명(**tsx, 네트워크 불필요**)
- `spike-session.mjs` — 멀티턴 맥락(1턴 추가 → 2턴 "방금 그거" 삭제)

> tsx 기반 2종(roundtrip, edge)은 인증/바이너리 없이 WSL에서 바로 돌아간다(`npx tsx scripts/...`).
> 나머지는 standalone 서버 + copilot 바이너리 + 인증이 필요.
