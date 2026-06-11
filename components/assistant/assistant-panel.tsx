"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Sparkles,
  Send,
  Square,
  PanelRightClose,
  Check,
  CircleSlash,
  Loader2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantEvent, ToolCategory } from "@/lib/assistant/types";

/*
 * AssistantPanel — FlowDesk AI 비서 우측 상주 패널.
 * Copilot SDK 기반 /api/assistant(SSE)를 소비해 스트리밍 응답 + tool 타임라인 + 승인 모달을 렌더.
 * 한지/먹 문법: 헤어라인 구분, 그림자 없음, 단청 레드는 destructive 승인에만 드물게.
 */

const OPEN_KEY = "flowdesk-assistant-open";
const AUTO_KEY = "flowdesk-assistant-auto";
const DEFAULT_MODEL = "claude-sonnet-4.6";
const MODEL_KEY = "flowdesk-assistant-model";

type ToolRun = {
  tool: string;
  category: ToolCategory;
  status: "running" | "ok" | "fail";
  message?: string;
};

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools: ToolRun[];
  streaming?: boolean;
};

type PendingApproval = {
  requestId: string;
  tool: string;
  category: ToolCategory;
  args: unknown;
};

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${performance.now()}-${Math.floor(performance.now() * 1000) % 100000}`;
  }
}

const CATEGORY_LABEL: Record<ToolCategory, string> = {
  read: "읽기",
  write: "쓰기",
  destructive: "삭제·교체",
};

// Electron preload 브릿지(패키지 앱에서만 존재). Window 타입 전역 선언 충돌을 피해 로컬 접근.
type FlowdeskBridge = {
  connectCopilot?: () => Promise<{ ok: boolean; error?: string }>;
  cancelCopilotConnect?: () => Promise<boolean>;
  onCopilotLoginCode?: (cb: (p: { code: string; url: string }) => void) => () => void;
};
function getBridge(): FlowdeskBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { flowdesk?: FlowdeskBridge }).flowdesk;
}

type LoginCode = { code: string; url: string };

export function AssistantPanel() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [autoExecute, setAutoExecute] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [models, setModels] = useState<string[]>([]);
  const [auth, setAuth] = useState<{ authenticated: boolean; login?: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [loginCode, setLoginCode] = useState<LoginCode | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const statusLoadedRef = useRef(false);

  // 초기화(localStorage) + ⌘J/Ctrl+J 토글
  useEffect(() => {
    setMounted(true);
    setOpen(localStorage.getItem(OPEN_KEY) === "true");
    setAutoExecute(localStorage.getItem(AUTO_KEY) === "true");
    const savedModel = localStorage.getItem(MODEL_KEY);
    if (savedModel) setModel(savedModel);
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((p) => {
          const next = !p;
          localStorage.setItem(OPEN_KEY, String(next));
          return next;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setOpenPersist = useCallback((v: boolean) => {
    setOpen(v);
    localStorage.setItem(OPEN_KEY, String(v));
  }, []);

  const toggleAuto = useCallback(() => {
    setAutoExecute((p) => {
      const next = !p;
      localStorage.setItem(AUTO_KEY, String(next));
      return next;
    });
  }, []);

  const setModelPersist = useCallback((m: string) => {
    setModel(m);
    localStorage.setItem(MODEL_KEY, m);
  }, []);

  const refetchStatus = useCallback(async () => {
    try {
      const d = (await fetch("/api/assistant/models").then((r) => r.json())) as {
        models?: string[];
        authenticated?: boolean;
        login?: string;
      };
      if (Array.isArray(d.models)) setModels(d.models);
      setAuth({ authenticated: !!d.authenticated, login: d.login });
    } catch {
      setAuth({ authenticated: false });
    }
  }, []);

  // 처음 열릴 때 모델 목록 + 인증 상태 1회 로드(copilot.exe spawn 비용 → lazy).
  useEffect(() => {
    if (!open || statusLoadedRef.current) return;
    statusLoadedRef.current = true;
    void refetchStatus();
  }, [open, refetchStatus]);

  // device flow 연결(패키지 앱에서만). main.js가 copilot login을 spawn하고 코드를 보내온다.
  const connectCopilot = useCallback(async () => {
    const api = getBridge();
    if (!api?.connectCopilot) return;
    setConnecting(true);
    setLoginCode(null);
    const off = api.onCopilotLoginCode?.((p) => setLoginCode(p));
    try {
      const res = await api.connectCopilot();
      if (res?.ok) await refetchStatus();
    } finally {
      setConnecting(false);
      setLoginCode(null);
      off?.();
    }
  }, [refetchStatus]);

  const cancelConnect = useCallback(() => {
    getBridge()?.cancelCopilotConnect?.();
    setConnecting(false);
    setLoginCode(null);
  }, []);

  // 자동 스크롤
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, isRunning]);

  const patchTurn = useCallback((turnId: string, fn: (t: Turn) => Turn) => {
    setTurns((prev) => prev.map((t) => (t.id === turnId ? fn(t) : t)));
  }, []);

  const handleEvent = useCallback(
    (ev: AssistantEvent, turnId: string) => {
      if (ev.type === "session") {
        return; // 맥락은 history로 전달하므로 세션 정보는 표시에 사용하지 않음
      }
      switch (ev.type) {
        case "delta":
          patchTurn(turnId, (t) => ({ ...t, content: t.content + ev.text }));
          break;
        case "message":
          if (ev.text) patchTurn(turnId, (t) => ({ ...t, content: ev.text }));
          break;
        case "done":
          patchTurn(turnId, (t) => ({ ...t, content: ev.content || t.content, streaming: false }));
          break;
        case "tool_start":
          patchTurn(turnId, (t) => ({
            ...t,
            tools: [...t.tools, { tool: ev.tool, category: ev.category, status: "running" }],
          }));
          break;
        case "tool_result":
          patchTurn(turnId, (t) => {
            const tools = [...t.tools];
            for (let i = tools.length - 1; i >= 0; i--) {
              if (tools[i].tool === ev.tool && tools[i].status === "running") {
                tools[i] = { ...tools[i], status: ev.ok ? "ok" : "fail", message: ev.message };
                break;
              }
            }
            return { ...t, tools };
          });
          break;
        case "permission_request":
          setPending({ requestId: ev.requestId, tool: ev.tool, category: ev.category, args: ev.args });
          break;
        case "permission_resolved":
          setPending(null);
          break;
        case "error":
          patchTurn(turnId, (t) => ({
            ...t,
            content: t.content + (t.content ? "\n\n" : "") + `⚠️ ${ev.message}`,
            streaming: false,
          }));
          break;
        default:
          break;
      }
    },
    [patchTurn],
  );

  const respondApproval = useCallback(async (requestId: string, approved: boolean) => {
    setPending(null);
    try {
      await fetch("/api/assistant/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, approved }),
      });
    } catch {
      /* 무시 — 서버가 abort/timeout 처리 */
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isRunning) return;
    setInput("");

    // 직전까지의 대화를 맥락으로 전달(멀티턴). 현재 입력은 prompt로 따로 보냄.
    const history = turns
      .filter((t) => t.content)
      .map((t) => ({ role: t.role, content: t.content }));

    const asstId = uid();
    setTurns((prev) => [
      ...prev,
      { id: uid(), role: "user", content: text, tools: [] },
      { id: asstId, role: "assistant", content: "", tools: [], streaming: true },
    ]);
    setIsRunning(true);

    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: text, model, autoExecute, history }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        handleEvent({ type: "error", message: `요청 실패 (HTTP ${res.status})` }, asstId);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const line = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            handleEvent(JSON.parse(line.slice(6)) as AssistantEvent, asstId);
          } catch {
            /* malformed chunk skip */
          }
        }
      }
    } catch (e) {
      if (!ac.signal.aborted) {
        handleEvent({ type: "error", message: (e as Error)?.message ?? String(e) }, asstId);
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
      patchTurn(asstId, (t) => ({ ...t, streaming: false }));
    }
  }, [input, isRunning, autoExecute, model, turns, handleEvent, patchTurn]);

  const newConversation = useCallback(() => {
    if (isRunning) return;
    setTurns([]);
  }, [isRunning]);

  if (!mounted) return null;

  // 닫힘: 우측 가장자리 얇은 열기 탭(데스크톱)
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpenPersist(true)}
        className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-1.5 bg-surface border border-border border-r-0 rounded-l-sm px-1.5 py-3 text-ink-soft hover:text-foreground hover:bg-surface-2 transition-colors duration-short ease-out-flow"
        aria-label="AI 비서 열기 (⌘J)"
        title="AI 비서 (⌘J)"
      >
        <Sparkles className="w-4 h-4 text-accent" strokeWidth={1.5} />
        <span className="mono-meta [writing-mode:vertical-rl]">비서</span>
      </button>
    );
  }

  return (
    <>
      <aside className="hidden md:flex w-[380px] shrink-0 h-screen sticky top-0 flex-col bg-surface border-l border-border">
        {/* 헤더 */}
        <div className="h-14 shrink-0 flex items-center justify-between px-md border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-accent shrink-0" strokeWidth={1.5} />
            <span className="font-display text-md tracking-tight text-foreground shrink-0">비서</span>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="mono-meta !normal-case !tracking-snug inline-flex items-center gap-1 text-ink-soft hover:text-foreground transition-colors duration-short min-w-0"
                  title="모델 선택"
                >
                  <span className="truncate">{model}</span>
                  <ChevronDown className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={6}
                  className="z-50 min-w-[180px] max-h-[50vh] overflow-y-auto bg-surface border border-border-strong rounded-sm py-1 shadow-[0_8px_24px_rgba(20,18,16,0.10)]"
                >
                  {(models.length ? models : [model]).map((m) => (
                    <DropdownMenu.Item
                      key={m}
                      onSelect={() => setModelPersist(m)}
                      className={cn(
                        "px-3 py-1.5 text-sm cursor-pointer outline-none transition-colors duration-short",
                        m === model ? "bg-surface-2 text-foreground" : "text-ink-soft hover:bg-surface-2/60",
                      )}
                    >
                      {m}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={newConversation}
              disabled={isRunning || turns.length === 0}
              className="p-1.5 text-ink-soft hover:bg-surface-2 transition-colors duration-short ease-out-flow disabled:opacity-40"
              aria-label="새 대화"
              title="새 대화 시작(맥락 초기화)"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => setOpenPersist(false)}
              className="p-1.5 text-ink-soft hover:bg-surface-2 transition-colors duration-short ease-out-flow"
              aria-label="비서 닫기"
            >
              <PanelRightClose className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* 인증 경고 + 연결(미로그인 시) */}
        {auth && !auth.authenticated && (
          <div className="shrink-0 flex items-start gap-2 px-md py-2 bg-warn/10 border-b border-warn/30 text-xs text-ink-soft">
            <AlertCircle className="w-3.5 h-3.5 text-warn shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <p>GitHub Copilot 계정 연결이 필요합니다.</p>
              {getBridge()?.connectCopilot ? (
                <button
                  type="button"
                  onClick={() => void connectCopilot()}
                  disabled={connecting}
                  className="mt-1 inline-flex items-center gap-1 text-accent hover:underline disabled:opacity-50"
                >
                  {connecting ? "연결 중…" : "Copilot 연결하기"}
                </button>
              ) : (
                <p className="mt-0.5">
                  터미널에서 <span className="font-mono text-foreground">copilot login</span> 후 다시 시도하세요.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 대화 영역 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-md py-md flex flex-col gap-lg">
          {turns.length === 0 && (
            <div className="text-sm text-muted-foreground leading-relaxed">
              할 일·문서·회의록·업무로그를 자연어로 시켜보세요.
              <br />
              <span className="text-ink-soft">예: “오늘 할 일에 내일 보고서 초안 작성 추가하고, 6월 3주차 업무로그 정리해줘”</span>
            </div>
          )}
          {turns.map((t) => (
            <TurnView key={t.id} turn={t} />
          ))}
        </div>

        {/* 입력 영역 */}
        <div className="shrink-0 border-t border-border px-md py-sm">
          <div className="flex items-center justify-between mb-sm">
            <button
              type="button"
              onClick={toggleAuto}
              className="inline-flex items-center gap-1.5 mono-meta !normal-case !tracking-snug text-ink-soft hover:text-foreground transition-colors duration-short"
              title="켜면 쓰기(write) 작업을 승인 없이 자동 실행합니다. 삭제·교체는 항상 승인이 필요합니다."
            >
              <span
                className={cn(
                  "w-7 h-4 rounded-full border transition-colors duration-short relative",
                  autoExecute ? "bg-accent/20 border-accent" : "bg-surface-2 border-border-strong",
                )}
                aria-hidden
              >
                <span
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full transition-all duration-short",
                    autoExecute ? "left-3.5 bg-accent" : "left-0.5 bg-muted-foreground",
                  )}
                />
              </span>
              자동 실행
            </button>
            <span className="mono-meta !normal-case !tracking-snug">⌘J 토글</span>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="비서에게 시키기…"
              rows={2}
              disabled={isRunning}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-border focus:border-border-strong transition-colors duration-short py-1 disabled:opacity-50"
              aria-label="비서 입력"
            />
            {isRunning ? (
              <button
                type="button"
                onClick={stop}
                className="shrink-0 inline-flex items-center justify-center w-8 h-8 border border-border-strong rounded-sm text-ink-soft hover:bg-surface-2 transition-colors duration-short"
                aria-label="중지"
                title="중지"
              >
                <Square className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void send()}
                disabled={!input.trim()}
                className="shrink-0 inline-flex items-center justify-center w-8 h-8 border border-border-strong rounded-sm text-foreground hover:bg-surface-2 transition-colors duration-short disabled:opacity-40"
                aria-label="전송"
                title="전송 (⏎)"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <ApprovalModal pending={pending} onRespond={respondApproval} />
      <LoginModal open={connecting} code={loginCode} onCancel={cancelConnect} />
    </>
  );
}

function LoginModal({
  open,
  code,
  onCancel,
}: {
  open: boolean;
  code: LoginCode | null;
  onCancel: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/30 backdrop-blur-[2px] z-50 animate-in fade-in duration-micro" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(420px,calc(100vw-32px))] bg-surface border border-border-strong rounded-md z-50 flex flex-col overflow-hidden shadow-[0_8px_24px_rgba(20,18,16,0.10)]">
          <div className="px-md pt-md pb-sm flex items-center gap-2 border-b border-border">
            <Sparkles className="w-4 h-4 text-accent shrink-0" strokeWidth={1.5} />
            <Dialog.Title className="text-md font-medium text-foreground">Copilot 계정 연결</Dialog.Title>
          </div>
          <div className="px-md py-md flex flex-col items-center gap-sm">
            {code ? (
              <>
                <Dialog.Description className="text-sm text-ink-soft text-center">
                  열린 브라우저(github.com/login/device)에 아래 코드를 입력하세요.
                </Dialog.Description>
                <div className="text-2xl font-mono tracking-[0.3em] text-foreground select-all py-2">
                  {code.code}
                </div>
                <a
                  href={code.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mono-meta !normal-case !tracking-snug text-accent hover:underline"
                >
                  {code.url} 다시 열기
                </a>
                <div className="flex items-center gap-2 text-muted-foreground text-xs mt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                  인증을 기다리는 중…
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-md">
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                연결을 준비하는 중…
              </div>
            )}
          </div>
          <div className="px-md py-sm flex justify-end border-t border-border">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-ink-soft border border-border-strong rounded-sm hover:bg-surface-2 transition-colors duration-short"
            >
              취소
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="mono-meta">나</span>
        <div className="max-w-[90%] bg-surface-2 border border-border rounded-sm px-sm py-2 text-sm text-foreground whitespace-pre-wrap break-words">
          {turn.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {turn.tools.length > 0 && (
        <ul className="flex flex-col gap-1">
          {turn.tools.map((tr, i) => (
            <ToolRunRow key={i} run={tr} />
          ))}
        </ul>
      )}
      {turn.content && (
        <div className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
          {turn.content}
          {turn.streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-accent/70 animate-pulse" aria-hidden />}
        </div>
      )}
      {!turn.content && turn.streaming && turn.tools.length === 0 && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
          생각 중…
        </div>
      )}
    </div>
  );
}

function ToolRunRow({ run }: { run: ToolRun }) {
  const isDestructive = run.category === "destructive";
  return (
    <li
      className={cn(
        "relative flex items-center gap-2 pl-2.5 pr-2 py-1 bg-surface-2/50 border border-border rounded-sm",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-0 bottom-0 w-[2px]",
          isDestructive ? "bg-accent" : "bg-border-strong",
        )}
        aria-hidden
      />
      {run.status === "running" && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" strokeWidth={1.5} />}
      {run.status === "ok" && <Check className="w-3 h-3 text-success shrink-0" strokeWidth={2} />}
      {run.status === "fail" && <CircleSlash className="w-3 h-3 text-danger shrink-0" strokeWidth={1.5} />}
      <span className="mono-meta !normal-case !tracking-snug text-ink-soft shrink-0">{run.tool}</span>
      {run.message && (
        <span className="text-xs text-muted-foreground truncate">{run.message}</span>
      )}
    </li>
  );
}

function ApprovalModal({
  pending,
  onRespond,
}: {
  pending: PendingApproval | null;
  onRespond: (requestId: string, approved: boolean) => void;
}) {
  const isDestructive = pending?.category === "destructive";
  return (
    <Dialog.Root
      open={!!pending}
      onOpenChange={(o) => {
        if (!o && pending) onRespond(pending.requestId, false);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/30 backdrop-blur-[2px] z-50 animate-in fade-in duration-micro" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(440px,calc(100vw-32px))] bg-surface border border-border-strong rounded-md z-50 flex flex-col overflow-hidden shadow-[0_8px_24px_rgba(20,18,16,0.10)]">
          <div className="px-md pt-md pb-sm flex items-center gap-2 border-b border-border">
            <AlertTriangle
              className={cn("w-4 h-4 shrink-0", isDestructive ? "text-danger" : "text-warn")}
              strokeWidth={1.5}
            />
            <Dialog.Title className="text-md font-medium text-foreground">
              {isDestructive ? "삭제·교체 승인" : "쓰기 승인"}
            </Dialog.Title>
          </div>
          <div className="px-md py-sm flex flex-col gap-2">
            <Dialog.Description className="text-sm text-ink-soft">
              비서가 다음 작업을 실행하려 합니다.
            </Dialog.Description>
            <div className="flex items-center gap-2">
              <span className="mono-meta !normal-case !tracking-snug text-foreground">{pending?.tool}</span>
              <span
                className={cn(
                  "mono-meta px-1.5 py-0.5 border rounded-sm",
                  isDestructive ? "border-danger text-danger" : "border-border-strong text-ink-soft",
                )}
              >
                {pending ? CATEGORY_LABEL[pending.category] : ""}
              </span>
            </div>
            <pre className="mt-1 max-h-40 overflow-auto bg-surface-2 border border-border rounded-sm p-2 text-xs text-ink-soft font-mono whitespace-pre-wrap break-words">
              {pending ? JSON.stringify(pending.args, null, 2) : ""}
            </pre>
          </div>
          <div className="px-md py-sm flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={() => pending && onRespond(pending.requestId, false)}
              className="px-3 py-1.5 text-sm text-ink-soft border border-border-strong rounded-sm hover:bg-surface-2 transition-colors duration-short"
            >
              거부
            </button>
            <button
              type="button"
              onClick={() => pending && onRespond(pending.requestId, true)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-sm border transition-colors duration-short",
                isDestructive
                  ? "border-danger text-danger hover:bg-danger/10"
                  : "border-foreground text-foreground hover:bg-surface-2",
              )}
            >
              허용
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
