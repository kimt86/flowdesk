# FlowDesk AI 비서 — 구현 계획

> FlowDesk 워크스페이스 **위에서 직접 일하는** AI 비서. 사용자가 명령하면 할일을
> 업데이트하고, 문서를 수정하고, 회의록을 작성하고, 한 일을 정리한다. 환경설정에서
> 본인의 **구독(Copilot / Claude Pro·Max)** 또는 종량제 API 키를 연결해 사용한다.

상태: **계획 확정 → Phase 0 스파이크 진행 중** (작성 2026-06-09)

---

## 1. 핵심 발견 (정밀 조사 결론)

두 에이전트 런타임 SDK를 공식 문서·npm tarball까지 실측 조사한 결과:

- **두 SDK 모두 "순수 in-process"가 아니다.** `@github/copilot-sdk`와
  `@anthropic-ai/claude-agent-sdk` 둘 다 **JS 래퍼 + 플랫폼 네이티브 CLI 바이너리**
  (`copilot.exe` ~150MB / `claude.exe` ~243MB)를 `child_process`로 spawn하는 구조다.
  바이너리는 npm `optionalDependencies`로 동봉된다.
- 따라서 **성패의 90%는 추론이 아니라 패키징**이다 — "asar:true 안에서 이 .exe를
  어떻게 밖으로 빼서 spawn하느냐."
- **FlowDesk는 이미 이 문제를 풀어놨다.** `electron-builder.yml`의 `extraResources`
  (`.next/standalone` → `resources/standalone`) + `scripts/after-pack.js`(electron-builder의
  `!**/node_modules/**` 글로벌 필터를 우회해 standalone node_modules를 직접 복사)가
  정확히 같은 메커니즘이다. SDK 네이티브 패키지만 이 경로에 포함시키면 된다.
- **환경 적합성**: Electron 42.3.3 = Node 24.15 → Copilot CLI의 Node24 요구 충족.
  `startServer()`가 `ELECTRON_RUN_AS_NODE=1`로 fork → SDK가 이 Node24 위에서 동작.
  Windows-x64 단일 타깃 → 크로스플랫폼 바이너리 누락 문제 없음(빌드 머신=배포 타깃).

### 프로바이더 비대칭 (확정 근거)

| | **Copilot SDK** | **Claude Agent SDK** |
|---|---|---|
| 인증 UX | device flow / PAT 주입 (구현 부담 ↑) | `setup-token` 1년 토큰, 1회 발급 (깔끔) |
| 승인 게이트 | `onPermissionRequest` | `canUseTool` 1급 콜백 (최강) |
| **비용 정책** | 분리 정책 **미확인**(현재 더 헐거움) | **2026-06-15부터 월 Agent SDK 크레딧($20~200)에서 차감 — 무제한 아님** |
| 모델 | GPT-5 / GPT-4.1 계열 | Claude 계열 |
| 바이너리 | `copilot.exe` ~150MB | `claude.exe` ~243MB |

> ⚠️ 모델 비대칭은 Phase 0 실측으로 **무너졌다** — 아래 참조.

### Phase 0 실측 결과 (2026-06-09, copilot.exe 1.0.60 / protocol v3)

스파이크(`scripts/spike-copilot.mjs`)로 임베드·인증·tool·파일쓰기를 모두 검증 — **PASS**:

- **copilot.exe spawn 성공**: `RuntimeConnection.forStdio({ path: copilot.exe })`로 직접
  네이티브 exe를 spawn(npm-loader.js·detect-libc 우회). `client.start`/`getStatus` OK
  (v1.0.60, protocol 3).
- **인증 자동**: 토큰 주입 없이(`useLoggedInUser` 기본 true) 키체인 OAuth로 인증됨
  (`getAuthStatus → { isAuthenticated:true, authType:"user", login:"clt-tk" }`).
  → **device flow/PAT 구현이 필수가 아님**(이미 로그인된 사용자는 즉시 동작). 미로그인
  사용자용 device flow는 Phase 2에서 보강.
- **in-process tool + 파일쓰기 검증**: `claude-haiku-4.5`로 추론 →
  `tool.execution_start(add_today_task) → complete` → 임시 워크스페이스 TODO.md에 실제
  라인 추가(`containsItem:true`), 한국어 응답.
- **★ 결정적 발견 — Copilot 구독으로 사용 가능한 모델 15종**:
  `auto, claude-opus-4.8, claude-opus-4.7, claude-opus-4.6, claude-opus-4.5,
  claude-sonnet-4.6, claude-sonnet-4.5, claude-haiku-4.5, gpt-5.5, gpt-5.4,
  gpt-5.3-codex, gpt-5.4-mini, gpt-5-mini, gemini-3.1-pro-preview, gemini-3.5-flash`.
  → **Copilot SDK 단일 프로바이더로 Claude Opus 4.8 + GPT-5.5 + Gemini 3.1 Pro를 모두
  커버.** "Copilot=GPT / Claude=Claude" 비대칭이 무너짐. 모델은 설정에서 선택.

- **패키징 검증(Phase 0c, win-unpacked 실측)**: `next build` standalone nft가
  `@github/copilot-sdk`는 트레이싱하나 `@github/copilot`·copilot.exe는 누락(chokidar와 동일).
  → copilot.exe(143MB)만 `extraResources`(resources/agent-bins) 동봉 + main.js fork env
  `FLOWDESK_COPILOT_EXE` 주입으로 **패키지 standalone에서 라우트 200 확인**.
  `@github/copilot`(로더/ripgrep/mxc-bin/wasm) 전체 불필요 실증. electron-builder가 app.asar에
  자동 포함한 @github 중복 415MB를 `files: !node_modules/@github/**` 로 제거 →
  **win-unpacked 1250MB → 834MB**. (잔여: app.asar 165MB next/react 중복 = 데스크톱 전환 때
  수용한 별개 이슈, 비서 범위 밖.)

**아키텍처 영향**: Claude Agent SDK(claude.exe ~243MB)를 별도 동봉할 동기가 크게 약화됨
(Copilot으로 Claude 모델 접근 가능). Phase 6(Claude SDK 확장)은 **보류** — 구독 크레딧
정책/한도 차이가 실측으로 문제될 때만 재검토. 종량제 API키 폴백(`@anthropic-ai/sdk`)은
오프라인/한도초과 대비로 유지.

---

## 2. 확정 결정 (사용자 승인 2026-06-09)

- **우선 프로바이더: Copilot SDK.** 월 크레딧 분리 정책이 미확인이라 "비서를 무겁게
  돌리기"에 더 안전하고, 바이너리도 더 작다(150MB). Claude/API키는 이후 동일 패턴 확장.
- **바이너리 동봉: 우선 1개만**(검증한 프로바이더 = copilot.exe). 설치 페이로드 절감 +
  변수 격리. 다른 프로바이더 추가 시 동봉 확장.
- **데이터 민감도**: 당분간 상관 없음(클라우드 추론 OK).
- **승인 모델**: 자동실행 토글(설정). 단 **DESTRUCTIVE(삭제 등)는 토글 무관 항상 승인.**

---

## 3. 확정 아키텍처

```
렌더러(비서 패널)
  └ SSE ─→ app/api/assistant/* (Next standalone 라우트, force-dynamic)
            └ 프로바이더 어댑터  [Copilot | Claude(추후) | API키 폴백(추후)]
                └ 공통 FlowDesk tool 레이어 (단일 진실원본)
                    └ lib/* CRUD  (WORKSPACE_ROOT 파일)
추론은 fork된 CLI 바이너리(copilot.exe)에서 수행 — 라우트는 in-process 래퍼만 호출
```

### 3.1 프로바이더 추상화 (분기의 심장)

`AssistantProvider` 인터페이스 — `run(prompt, { onEvent, signal }) → Promise<void>`,
이벤트를 `NormalizedEvent`(delta / tool_start / tool_result / permission_request / done /
error)로 정규화. 라우트는 프로바이더 무관하게 SSE 중계.

- **CopilotProvider** (Phase 1): `new CopilotClient({ cliPath, gitHubToken })` →
  `createSession({ model, streaming:true, tools, onPermissionRequest })` →
  `session.send()` + `session.on('assistant.message_delta' | 'session.idle')`.
  **세션 종료 시 `client.stop()` 필수**(좀비 프로세스 방지).
- **ClaudeSubProvider** (추후): `query({ prompt, options:{ pathToClaudeCodeExecutable,
  env:{...process.env, CLAUDE_CODE_OAUTH_TOKEN}, mcpServers, canUseTool,
  permissionMode:'default' } })` → `for await` SDKMessage.
- **ApiKeyProvider** (폴백, 추후): `@anthropic-ai/sdk` 직접 `messages.stream` + 수동
  tool 루프. 크레딧 소진 / 구독 미설정 / 오프라인 graceful fallback.

### 3.2 tool 레이어 — 한 번 작성, 양쪽 재사용

**lib/\*는 절대 MCP화하지 않는다.** 이미 같은 Node 프로세스(standalone 서버) 안에
있고 CRUD가 동기 함수이므로, 별도 MCP stdio 서버로 빼면 프로세스·직렬화·번들 부담만
늘고 이득이 없다. → **네이티브 in-process custom tool**이 정답.

- **단일 진실원본을 zod로 작성** → Claude는 `tool()`(zod 직접), Copilot은
  `defineTool()`(JSON Schema로 변환)로 어댑트. handler·description·name·실패정책은
  100% 공유.
- **실패는 throw 금지**: Claude는 `{ isError:true }`, Copilot은 에러 객체 반환
  (handler에서 throw하면 에이전트 루프 전체가 죽음).
- **MCP는 외부 통합 전용**: GitHub MCP, 캘린더/DB 등 lib/* 밖 도구를 붙일 때만.

초기 tool 셋(lib/* 바인딩):

| tool | lib 바인딩 | 분류 |
|---|---|---|
| `add_today_task` | `lib/today.addTodayTask` | write |
| `update_today_task` | `lib/today.updateTodayTask` | write |
| `toggle_today_task` | `lib/today.toggleTodayTask` | write |
| `delete_today_task` | `lib/today.deleteTodayTask` | **DESTRUCTIVE** |
| `read_today` | `lib/today.readToday` | read(자동승인) |
| `create_doc` / `write_doc` | `lib/docs.*` | write |
| `add_meeting_note` | `lib/meetings.*` | write |
| `add_work_log` | `lib/worklogs.*` | write |
| `add_idea` / `add_project` | `lib/ideas.* / lib/projects.*` | write |

### 3.3 인증 / 보안

- **발급**: Copilot = device flow(코드 + URL을 앱 UI에 표시, `shell.openExternal`로
  브라우저 오픈) 또는 PAT 붙여넣기. Claude(추후) = `claude setup-token` 출력값 붙여넣기.
- **저장**: Electron `safeStorage.encryptString` → `flowdesk-settings.json`(userData)에
  base64. 기존 `readSettings()/writeSettings()`(electron/main.js:66·73) 재사용, 토큰 필드만 추가.
  `safeStorage.isEncryptionAvailable()` false면 평문 저장 회피(미저장 + 매 실행 재입력).
- **주입**: `startServer()` fork env(electron/main.js:160)에 복호화값 주입 —
  `COPILOT_GITHUB_TOKEN`(Copilot), 추후 `CLAUDE_CODE_OAUTH_TOKEN`. 라우트의 SDK가 자동 픽업.
- **금기**: `ANTHROPIC_API_KEY`를 fork env에 **절대 넣지 않는다**(우선순위 3>5라 구독
  토큰을 덮어씀 — 공식 확인). Claude 구독 경로 사용 시 fork env에서 명시적으로 제거.
- 렌더러는 raw 토큰을 절대 보지 않는다. 토큰 변경 시 `changeWorkspaceFlow()`처럼 서버
  child만 재기동.

### 3.4 스트리밍 / 승인

- `app/api/file-watch/route.ts`의 SSE 패턴 그대로 재사용:
  `export const dynamic='force-dynamic'`, `ReadableStream` + `TextEncoder` +
  `data: ${json}\n\n`, keepalive, `cancel()` 정리. 프로바이더 onEvent에서 `enqueue`,
  done에서 `close`.
- **승인 모달**: SSE로 `permission_request` 이벤트 push → 렌더러가 결정 회신 →
  `onPermissionRequest`/`canUseTool`가 그 결정을 await. DESTRUCTIVE는 자동실행 토글
  무관 항상 게이트.

### 3.5 어드버서리얼 안전장치 (쓰기 신뢰성)

조사 외 추가 반영 — 사용자 데이터(WORKSPACE_ROOT) 손상 방지:

- **쓰기 전 백업**: 수정 대상 파일을 `.flowdesk-trash/`에 타임스탬프 사본 보관.
- **원자적 쓰기**: temp 파일 write → rename. 부분 write로 인한 손상 차단.
- **write-back 검증**: 쓰기 후 재파싱해 의도한 변경이 반영됐는지 확인, 실패 시 롤백.
- **파일 워처 정합**: `todo/` 가 현재 file-watcher 감시 대상인지 확인하고, 누락 시
  watchTargets에 추가(비서의 쓰기가 SSE 자동 새로고침에 반영되도록).
- **세션 토큰**: localhost 라우트에 `FLOWDESK_SESSION_TOKEN` 게이트(타 로컬 프로세스 차단).
- **예산/취소**: tool_result 바이트 캡 + 누적 토큰 예산 + `AbortController`/중지 버튼.

---

## 4. 패키징 (확정안)

기존 메커니즘(asar:true + extraResources + after-pack.js + fork env 주입) 재사용:

1. **바이너리는 asar 밖으로**: `electron-builder.yml` `extraResources`에
   `from: node_modules/@github/copilot-win32-x64 → to: agent-bins/copilot` 추가.
   런타임에 `process.resourcesPath` 기준 절대경로를 `cliPath`/`COPILOT_CLI_PATH`로 주입.
   (또는 `asarUnpack: ["**/@github/copilot-*/**"]`.)
2. **SDK JS는 standalone node_modules에**: `next.config.mjs`
   `experimental.serverComponentsExternalPackages`에 `@github/copilot-sdk`,
   `@github/copilot`, `@github/copilot-win32-x64`, `detect-libc` 추가(현 `chokidar`
   등록 위치 확장). `after-pack.js`에서 존재 검증 + 누락 시 명시 `cpSync` 보강.
3. **fork env 확장**: `COPILOT_GITHUB_TOKEN`(safeStorage 복호화) + copilot.exe 절대경로
   + `DISABLE_UPDATES`류(번들 바이너리 자동업데이트 차단).
4. **경로 해석**: dev = `node_modules/...`, prod = `process.resourcesPath/agent-bins/...`
   (기존 `standaloneDir()` 분기 패턴 따름).
5. **정리**: `main.js` `stopServer`/`before-quit`에서 SDK 클라이언트(`client.stop()`)·
   AbortController도 함께 정리(좀비 CLI 방지).
6. **코드서명**: 미서명 .exe spawn 시 SmartScreen/Defender 마찰 → 동봉 exe 서명 권장.

---

## 5. Phase 계획

- **Phase 0 — 스파이크 (go/no-go, 진행 중)**: `@github/copilot-sdk` 설치 →
  `app/api/assistant-spike/route.ts`(SSE)에서 `defineTool('add_today_task', ...)` →
  `lib/today.addTodayTask` 호출. 구독 토큰(`COPILOT_GITHUB_TOKEN`)으로 dev 추론 성공 →
  실제 `TODO`/오늘 파일에 라인 추가 확인. 이어서 `desktop:dir` 패키징 후
  **copilot.exe가 asar 밖에서 spawn되는지** 검증(FLOWDESK_SMOKE 확장). → **A·B 통과 시
  "조건부 가능 → 가능" 승격.**
- **Phase 1 — 프로바이더 + tool 레이어**: `AssistantProvider` 인터페이스 +
  `CopilotProvider`, zod 단일 진실원본 tool 셋(read/write/destructive 분류),
  `app/api/assistant/route.ts` SSE.
- **Phase 2 — 인증 UX**: 설정 화면에 Copilot device flow(코드+URL) / PAT 입력,
  safeStorage 저장, fork env 주입, 토큰 만료(401) graceful 재인증.
- **Phase 3 — 비서 패널 UI**: 렌더러 채팅 패널, 스트리밍 렌더, 승인 모달, 중지 버튼,
  자동실행 토글(설정).
- **Phase 4 — 어드버서리얼 안전장치**: 쓰기 전 백업/원자적 쓰기/write-back 검증,
  file-watcher 정합, 예산/캡.
- **Phase 5 — 패키징/배포**: extraResources + after-pack 보강, 스모크 검증, 버전 릴리스.
- **Phase 6 (추후) — Claude / API키 프로바이더 확장**: `ClaudeSubProvider` +
  `ApiKeyProvider`, 바이너리 동봉 확장 결정.

---

## 6. 리스크

- 설치 페이로드 +150MB(copilot.exe). electron-updater 차등 업데이트·blockmap·서명 시간 영향.
- Next 13.5 standalone nft가 동적 require / 네이티브 optionalDependency를 트레이싱에서
  누락하기 쉬움 → after-pack 존재 검증 + 명시 cpSync 보강 필수(chokidar 전력 있음).
- asar:true에서 .exe spawn 불가 → extraResources/asarUnpack + 절대경로 주입 필수.
- Copilot CLI Node24 enforcement(bin 로더) — Electron42=Node24라 패키지는 안전, dev에서
  로컬 Node 24 미만이면 깨질 수 있음(Phase 0 실측).
- 미서명 .exe spawn → SmartScreen/Defender 차단·지연.
- 좀비 프로세스 — `client.stop()`/abort를 종료 훅·워크스페이스 전환에 누락 금지.
- 오프라인 — 추론은 클라우드 의존. 비서만 비활성화하고 FlowDesk 본체(로컬 CRUD)는 격리.
- 쓰기 tool 오작동 → DESTRUCTIVE 승인 게이트 + 쓰기 전 백업 + write-back 검증으로 방어.

---

## 7. 미해결 질문

- Copilot 구독으로 실제 허용되는 model 식별자(gpt-5/gpt-4.1/claude?)와 무료/개인 한도로
  에이전트 루프가 충분한지.
- Copilot CLI Node24 강제 여부 실측(npm engines 미선언).
- `safeStorage.isEncryptionAvailable()`가 패키지 Windows에서 항상 true인지.
- Copilot 토큰 만료/취소 시 SDK 표면화 형태(이벤트/에러) → 재인증 UX 통일.
- next.config 13.5 `serverComponentsExternalPackages`에 SDK+네이티브 패키지 등록 시
  standalone server.js가 정상 require하는지(Phase 0 실측 항목).
- 향후 Copilot에도 'SDK 전용 사용량 분리' 정책이 생기는지(생기면 Copilot 우위 전제 흔들림).

---

## 부록 — 조사 출처(핵심)

- Copilot SDK: github.com/github/copilot-sdk (getting-started, auth, local-cli, mcp),
  npm `@github/copilot-sdk`(v1.0.0 GA 2026-06-02, node>=20), `@github/copilot`(CLI 런타임),
  `@github/copilot-win32-x64`(copilot.exe ~150MB).
- Claude Agent SDK: code.claude.com/docs/en/agent-sdk/*, npm
  `@anthropic-ai/claude-agent-sdk`(v0.3.169, node>=18), `-win32-x64`(claude.exe ~243MB),
  support.claude.com article 15036540(2026-06-15 월 Agent SDK 크레딧).
- 환경: Electron 42 = Node 24.15. FlowDesk: electron/main.js(fork+ELECTRON_RUN_AS_NODE),
  electron-builder.yml(asar+extraResources), scripts/after-pack.js.
