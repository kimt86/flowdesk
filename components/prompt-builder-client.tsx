"use client";

import { useState } from "react";
import { Zap, Copy, Check, FileText, CalendarRange, MessageSquare, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type PromptType = "weekly" | "meeting" | "doc" | "capture";

interface Props {
  stats: { inProgress: number; done: number; todo: number };
}

export function PromptBuilderClient({ stats }: Props) {
  const [activeType, setActiveType] = useState<PromptType>("weekly");
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // 폼 상태
  const [meetingNotes, setMeetingNotes] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docPurpose, setDocPurpose] = useState("");
  const [captureItems, setCaptureItems] = useState("");

  async function generatePrompt() {
    setLoading(true);
    try {
      let body: Record<string, string> = { type: activeType };
      if (activeType === "meeting") body.rawNotes = meetingNotes;
      if (activeType === "doc") { body.title = docTitle; body.purpose = docPurpose; }
      if (activeType === "capture") body.items = captureItems;

      const res = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setPrompt(data.prompt);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const TABS: { id: PromptType; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "weekly", label: "주간 보고서", icon: <CalendarRange className="w-4 h-4" />, desc: "이번 주 완료/진행/예정 항목을 수집해 주간 보고서 프롬프트를 만듭니다." },
    { id: "meeting", label: "회의록 구조화", icon: <MessageSquare className="w-4 h-4" />, desc: "자유 메모를 5분류 회의록 형식으로 변환하는 프롬프트를 만듭니다." },
    { id: "doc", label: "문서 초안", icon: <FileText className="w-4 h-4" />, desc: "dev-docs 형식에 맞는 기술 문서 초안 작성 프롬프트를 만듭니다." },
    { id: "capture", label: "메모 분류", icon: <Inbox className="w-4 h-4" />, desc: "여러 메모를 Todo/회의록/문서로 분류하는 프롬프트를 만듭니다." },
  ];

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          프롬프트 빌더
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          현재 업무 데이터 기반으로 Claude Code / Cowork에 바로 붙여넣을 수 있는 프롬프트를 생성합니다.
        </p>
      </div>

      {/* 현재 상태 요약 */}
      <div className="flex gap-3 mb-6 text-xs">
        <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">진행중 {stats.inProgress}개</span>
        <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full">완료 {stats.done}개</span>
        <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">할 일 {stats.todo}개</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 타입 선택 + 폼 */}
        <div className="space-y-4">
          {/* 탭 */}
          <div className="grid grid-cols-2 gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveType(tab.id); setPrompt(""); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-colors text-left",
                  activeType === tab.id
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border hover:bg-accent text-muted-foreground"
                )}
              >
                {tab.icon}
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 설명 */}
          <p className="text-xs text-muted-foreground">
            {TABS.find((t) => t.id === activeType)?.desc}
          </p>

          {/* 입력 폼 */}
          {activeType === "meeting" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">회의 메모 (자유 형식)</label>
              <textarea
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder="회의에서 나눈 내용을 자유롭게 입력하세요..."
                className="w-full h-32 px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {activeType === "doc" && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">문서 제목</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="예: TT Assignment 로직 설계서"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">작성 목적</label>
                <textarea
                  value={docPurpose}
                  onChange={(e) => setDocPurpose(e.target.value)}
                  placeholder="이 문서를 왜 작성하는지 간략히..."
                  className="w-full h-20 px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {activeType === "capture" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">메모 목록 (한 줄에 하나씩)</label>
              <textarea
                value={captureItems}
                onChange={(e) => setCaptureItems(e.target.value)}
                placeholder={"디지포트 API 연동 방식 확인 필요\n오늘 팀장님이 YC 인벤토리 기준 변경 얘기 하심\nISS-03 해결책 아이디어 떠올랐음"}
                className="w-full h-32 px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {activeType === "weekly" && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">자동 수집 항목:</p>
              <ul className="space-y-0.5">
                <li>• 완료 항목 {stats.done}개</li>
                <li>• 진행중 항목 {stats.inProgress}개</li>
                <li>• 할 일 항목 {stats.todo}개</li>
                <li>• 현재 날짜 / 주차</li>
              </ul>
            </div>
          )}

          <button
            onClick={generatePrompt}
            disabled={loading || (activeType === "meeting" && !meetingNotes.trim()) || (activeType === "doc" && !docTitle.trim())}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Zap className="w-4 h-4" />
            {loading ? "생성 중..." : "프롬프트 생성"}
          </button>
        </div>

        {/* 오른쪽: 결과 */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">생성된 프롬프트</span>
            {prompt && (
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 border border-border rounded-md hover:bg-accent transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? "복사됨!" : "클립보드 복사"}
              </button>
            )}
          </div>
          <div className="flex-1 bg-muted/30 border border-border rounded-lg p-3 min-h-64 max-h-[500px] overflow-y-auto">
            {!prompt ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                프롬프트 생성 버튼을 클릭하면<br />여기에 복사-붙여넣기용 프롬프트가 나타납니다.
              </p>
            ) : (
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{prompt}</pre>
            )}
          </div>
          {prompt && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-[10px] text-yellow-700">
                📋 복사 후 Claude Code 또는 Cowork에 붙여넣기 → Claude가 파일을 생성/수정하면 앱이 자동으로 감지합니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
