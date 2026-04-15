import type { Metadata } from "next";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardMeta,
  CardTitle,
  Input,
  InputGroup,
  InputLabel,
  Tag,
  Alert,
  KbdSequence,
  Textarea,
  Seal,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "디자인 시스템 · FlowDesk",
  description: "한지와 먹 · Hanji + Ink — primitives showcase",
};

export const dynamic = "force-static";

export default function DesignShowcasePage() {
  return (
    <div className="max-w-[1100px] mx-auto px-lg md:px-2xl py-xl md:py-2xl space-y-2xl">
      {/* Masthead */}
      <header className="border-b-[3px] border-foreground pb-md flex items-end justify-between flex-wrap gap-md">
        <div className="flex items-baseline gap-sm flex-wrap">
          <span className="seal" aria-hidden />
          <h1 className="font-display text-3xl">FlowDesk</h1>
          <span className="mono-meta !normal-case !tracking-snug !text-xs !text-muted-foreground">
            디자인 시스템 · 한지와 먹 · v0.1
          </span>
        </div>
        <span className="mono-meta">Stage 02 · Primitives</span>
      </header>

      {/* Thesis */}
      <section className="grid md:grid-cols-[1fr_1fr] gap-lg md:gap-xl items-start">
        <p className="font-display text-2xl leading-tight">
          잘 인쇄된 한국 일간지가 <span className="text-accent">칸반을 돌린다면</span>.
        </p>
        <div className="text-base text-ink-soft leading-relaxed space-y-3">
          <p>
            모든 primitive는 하나의 문법을 따른다 — 헤어라인 1px, radius 2px, 그림자 금지.
            강조는 단청 레드로, 드물게. 밀도는 생활용 데이터 드라이버 기준.
          </p>
          <p>
            이 페이지는 살아있는 스펙 문서다. 컴포넌트의 모양이 DESIGN.md와 다르면, 둘 중
            하나가 틀렸다.
          </p>
        </div>
      </section>

      {/* Buttons */}
      <Section title="Buttons" kicker="01 · Actions">
        <div className="space-y-md">
          <div className="flex gap-sm flex-wrap">
            <Button variant="primary">저장하기</Button>
            <Button variant="secondary">취소</Button>
            <Button variant="ghost">더 보기</Button>
            <Button variant="danger">삭제</Button>
          </div>
          <div className="flex gap-sm flex-wrap items-center">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </div>
          <p className="mono-meta !normal-case !tracking-snug text-xs !text-muted-foreground">
            Primary hover: ink → 단청 red. Focus: accent outline 2px.
          </p>
        </div>
      </Section>

      {/* Inputs */}
      <Section title="Inputs" kicker="02 · Forms">
        <div className="grid md:grid-cols-2 gap-lg max-w-[680px]">
          <InputGroup>
            <InputLabel htmlFor="todo-title">할 일 · Title</InputLabel>
            <Input
              id="todo-title"
              defaultValue="Q2 OKR 초안 — 디지털팀 성과지표 정리"
            />
          </InputGroup>
          <InputGroup>
            <InputLabel htmlFor="todo-cat">Category</InputLabel>
            <Input id="todo-cat" placeholder="예: PROJECT · OKR" />
          </InputGroup>
          <InputGroup className="md:col-span-2">
            <InputLabel htmlFor="todo-notes">Notes</InputLabel>
            <Textarea
              id="todo-notes"
              placeholder="자유로운 메모를 입력하세요..."
              defaultValue={
                "FlowDesk는 마크다운 파일을 신뢰합니다.\n모든 항목은 언제든지 .md로 내보낼 수 있습니다."
              }
            />
          </InputGroup>
        </div>
      </Section>

      {/* Tags */}
      <Section title="Tags" kicker="03 · Metadata">
        <div className="flex gap-xs flex-wrap">
          <Tag>PROJECT</Tag>
          <Tag tone="accent">URGENT</Tag>
          <Tag tone="success">DONE</Tag>
          <Tag tone="warn">REVIEW</Tag>
          <Tag tone="danger">BLOCKED</Tag>
          <Tag tone="filled">FEATURED</Tag>
        </div>
      </Section>

      {/* Cards */}
      <Section title="Cards" kicker="04 · Index cards, not shadows">
        <div className="grid md:grid-cols-3 gap-sm">
          <Card>
            <CardHeader>
              <CardTitle>FlowDesk 디자인 시스템 v0.1 초안 검토</CardTitle>
              <CardMeta>
                <span>DESIGN</span>
                <span>STARTED 13:45</span>
                <span>DRAFT</span>
              </CardMeta>
            </CardHeader>
          </Card>
          <Card urgent>
            <CardHeader>
              <CardTitle>Q2 OKR 초안 — 디지털팀 성과지표 정리</CardTitle>
              <CardMeta>
                <span>PROJECT · OKR</span>
                <span>STARTED 11:20</span>
                <span>DUE 17:00</span>
              </CardMeta>
            </CardHeader>
          </Card>
          <Card interactive>
            <CardHeader>
              <CardTitle>4월 4주차 주간보고</CardTitle>
              <CardMeta>
                <span>REPORT</span>
                <span>IN PROGRESS</span>
              </CardMeta>
            </CardHeader>
            <CardBody className="mt-xs">
              인터랙티브 카드. hover 시 border가 강조된다.
            </CardBody>
          </Card>
        </div>
      </Section>

      {/* Alerts */}
      <Section title="Alerts" kicker="05 · Semantic messaging">
        <div className="space-y-xs max-w-[680px]">
          <Alert tone="info">
            markdown 파일이 변경되었습니다 — 자동으로 반영됩니다.
          </Alert>
          <Alert tone="success">4월 4주차 주간보고가 아카이브되었습니다.</Alert>
          <Alert tone="warn">회의록에 참석자가 지정되지 않았습니다.</Alert>
          <Alert tone="danger">
            파일 잠금 감지 — 다른 프로세스가 수정 중입니다.
          </Alert>
        </div>
      </Section>

      {/* Kbd */}
      <Section title="Keyboard hints" kicker="06 · Command palette & shortcuts">
        <div className="space-y-sm text-sm text-ink-soft">
          <div className="flex items-center gap-sm">
            <KbdSequence keys={["⌘", "K"]} />
            <span>커맨드 팔레트 열기</span>
          </div>
          <div className="flex items-center gap-sm">
            <KbdSequence keys={["G", "T"]} separator="then" />
            <span>오늘로 이동</span>
          </div>
          <div className="flex items-center gap-sm">
            <KbdSequence keys={["⌘", "/"]} />
            <span>단축키 전체 보기</span>
          </div>
        </div>
      </Section>

      {/* Ink-bleed signature */}
      <Section title="Signature" kicker="07 · Ink-bleed on completion">
        <div className="space-y-sm max-w-[680px]">
          <p className="text-sm text-ink-soft">
            할 일이 완료될 때 단청 레드 밑줄이 왼쪽에서 오른쪽으로 번진다. 단순한 체크
            대신 의례(ritual)에 가깝게.
          </p>
          <ul className="space-y-2 text-base">
            <li className="ink-bleed" data-done="true">
              이메일 정리 · 받은편지함 0건
            </li>
            <li className="ink-bleed" data-done="true">
              어제 회의록 정리 및 업로드
            </li>
            <li className="ink-bleed" data-done="false">
              아직 진행 중인 항목
            </li>
          </ul>
        </div>
      </Section>

      {/* Seal stamp */}
      <Section title="Seal" kicker="08 · Ritual of completion">
        <div className="space-y-md max-w-[680px]">
          <p className="text-sm text-ink-soft leading-relaxed">
            완료·아카이브·주간보고 마감처럼 <em className="not-italic text-foreground">의례에 가까운 순간</em>에만
            찍히는 표식. 단청 레드, 약간 기울어진 각도로. 아무데나 쓰지 않는다.
          </p>
          <div className="border border-border bg-surface px-lg py-md flex items-center gap-xl flex-wrap">
            <div className="flex flex-col items-center gap-2">
              <Seal size="sm" />
              <span className="mono-meta">SM · 14px</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Seal size="md" />
              <span className="mono-meta">MD · 24px</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Seal size="lg" />
              <span className="mono-meta">LG · 40px</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Seal size="md" glyph="完" />
              <span className="mono-meta">완 · 완료</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Seal size="md" glyph="存" />
              <span className="mono-meta">존 · 보관</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Seal size="md" glyph="週" />
              <span className="mono-meta">주 · 주간보고</span>
            </div>
          </div>
          <p className="mono-meta !normal-case !tracking-snug text-xs text-muted-foreground">
            사용 예시: 아카이브 리스트 우상단 · 주간보고 제출 직후 · 연말 완결 화면.
            매일 보이는 자리에는 쓰지 않는다 — 의미가 닳는다.
          </p>
        </div>
      </Section>

      {/* Color swatches */}
      <Section title="Color" kicker="09 · 한지와 먹">
        <div className="grid md:grid-cols-2 gap-lg">
          <SwatchGrid
            title="한지 / Hanji (Light)"
            items={[
              { label: "Background", hex: "#F5F1E8", bg: "#F5F1E8" },
              { label: "Surface", hex: "#FBF8F1", bg: "#FBF8F1" },
              { label: "Ink", hex: "#1A1816", bg: "#1A1816" },
              { label: "Muted", hex: "#6D685F", bg: "#6D685F" },
              { label: "Border", hex: "#D9D1C0", bg: "#D9D1C0" },
              { label: "단청 Accent", hex: "#C9452B", bg: "#C9452B" },
              { label: "Success", hex: "#3D6A4A", bg: "#3D6A4A" },
              { label: "Warning", hex: "#B8861E", bg: "#B8861E" },
              { label: "Danger", hex: "#9C3220", bg: "#9C3220" },
            ]}
          />
          <SwatchGrid
            title="수묵 / Sumuk (Dark)"
            items={[
              { label: "Background", hex: "#141210", bg: "#141210" },
              { label: "Surface", hex: "#1D1A17", bg: "#1D1A17" },
              { label: "Ink", hex: "#ECE6D9", bg: "#ECE6D9" },
              { label: "Muted", hex: "#857F74", bg: "#857F74" },
              { label: "Border", hex: "#2B2724", bg: "#2B2724" },
              { label: "단청 Accent", hex: "#E06546", bg: "#E06546" },
              { label: "Success", hex: "#6FA37B", bg: "#6FA37B" },
              { label: "Warning", hex: "#D9A347", bg: "#D9A347" },
              { label: "Danger", hex: "#C95540", bg: "#C95540" },
            ]}
          />
        </div>
      </Section>

      <footer className="pt-xl border-t border-border mono-meta flex justify-between flex-wrap gap-xs">
        <span>FlowDesk · Design System v0.1 · 한지와 먹</span>
        <span>Stage 02 primitives · /design</span>
      </footer>
    </div>
  );
}

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-md">
      <div className="flex items-baseline justify-between border-b border-border pb-2">
        <h2 className="font-display text-xl">{title}</h2>
        <span className="mono-meta">{kicker}</span>
      </div>
      {children}
    </section>
  );
}

function SwatchGrid({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; hex: string; bg: string }>;
}) {
  return (
    <div>
      <h3 className="font-display text-md mb-sm pb-2 border-b border-border">
        {title}
      </h3>
      <div className="space-y-px">
        {items.map((s) => (
          <div
            key={s.label}
            className="grid grid-cols-[56px_1fr_auto] items-center gap-md border border-border bg-surface px-sm py-2 text-sm"
          >
            <span
              className="block w-14 h-7 border border-border-strong"
              style={{ background: s.bg }}
              aria-hidden
            />
            <span className="font-medium">{s.label}</span>
            <span className="mono-meta !normal-case">{s.hex}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
