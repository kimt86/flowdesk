import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, Element, ElementContent } from "hast";
import type { Schema } from "hast-util-sanitize";
import path from "path";
import { createHash } from "crypto";

// GFM 체크리스트(input[type=checkbox])를 sanitize에서 허용하는 스키마.
// defaultSchema는 br/ul/ol/li를 이미 허용하므로 표 안 줄바꿈/리스트는 추가 설정 불필요.
const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    input: [["type", "checkbox"], ["disabled", true]],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "input"],
};

/**
 * 표 셀 안에서 백슬래시 줄바꿈(`\\`)을 `<br>`로 변환하는 전처리.
 * GFM 표는 한 줄짜리라 CommonMark의 줄바꿈 문법이 안 통하므로 source 단에서 치환.
 * `|`가 포함된 줄(=표 행으로 추정)에 한해서만 적용 — 본문 내 `\\`는 그대로 둠.
 */
function preprocessTableBackslashBreaks(source: string): string {
  return source
    .split("\n")
    .map((line) => (line.includes("|") ? line.replace(/\\\\/g, "<br>") : line))
    .join("\n");
}

/**
 * 마크다운 내 상대경로 .md 링크를 /docs/view?path=... 형태로 리라이팅하는 rehype 플러그인.
 */
function rehypeRewriteDocLinks(currentRelPath: string) {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const href = node.properties?.href;
      if (typeof href !== "string") return;
      if (/^[a-z][a-z0-9+\-.]*:/i.test(href)) return;
      if (href.startsWith("#")) return;
      if (!href.endsWith(".md")) return;

      const currentDir = path.dirname(currentRelPath.replace(/\\/g, "/"));
      const resolved = path.posix.normalize(
        path.posix.join(currentDir, href)
      );
      node.properties.href = `/docs/view?path=${encodeURIComponent(resolved)}`;
    });
  };
}

/**
 * 표 셀 내용을 분석해 모든 라인이 `- ` / `* `로 시작하면 `<ul><li>...</li></ul>`로 변환.
 * 라인 구분은 `<br>` 요소(원본 `<br>` 또는 `\\`로 변환된 것). Pandoc 스타일 다행 표 흉내.
 */
function rehypeTableCellLists() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "td" && node.tagName !== "th") return;

      // <br>로 분리된 라인 그룹화
      const lines: ElementContent[][] = [[]];
      for (const child of node.children) {
        if (child.type === "element" && child.tagName === "br") {
          lines.push([]);
        } else {
          lines[lines.length - 1].push(child);
        }
      }

      // 비어있지 않은 라인만
      const nonEmpty = lines.filter((line) =>
        line.some(
          (n) =>
            (n.type === "text" && n.value.trim()) ||
            n.type === "element"
        )
      );
      if (nonEmpty.length < 2) return;

      // 모든 라인이 첫 텍스트 노드에서 `- ` 또는 `* `로 시작하는지 검사
      const stripped: ElementContent[][] = [];
      for (const line of nonEmpty) {
        const first = line[0];
        if (!first || first.type !== "text") return;
        const m = first.value.match(/^\s*[-*]\s+([\s\S]*)$/);
        if (!m) return;
        const newLine: ElementContent[] = [...line];
        newLine[0] = { type: "text", value: m[1] };
        stripped.push(newLine);
      }

      // <ul><li>... 로 교체
      node.children = [
        {
          type: "element",
          tagName: "ul",
          properties: {},
          children: stripped.map((line) => ({
            type: "element",
            tagName: "li",
            properties: {},
            children: line,
          })),
        },
      ];
    });
  };
}

/**
 * renderMarkdown 결과 LRU 캐시 — content hash 기반.
 * 같은 (relPath, content) 조합은 unified 파이프라인 통째 skip → 50-200ms 절약.
 * content가 바뀌면 자동으로 새 키가 되어 stale 걱정 없음.
 * Map insertion order로 LRU 흉내 (get 시 재삽입).
 */
const RENDER_CACHE_LIMIT = 200;
const renderCache = new Map<string, string>();

function renderCacheKey(relPath: string, content: string): string {
  return createHash("sha1")
    .update(relPath)
    .update("\0")
    .update(content)
    .digest("hex");
}

function renderCacheGet(key: string): string | undefined {
  const v = renderCache.get(key);
  if (v !== undefined) {
    // LRU touch: 끝으로 이동
    renderCache.delete(key);
    renderCache.set(key, v);
  }
  return v;
}

function renderCacheSet(key: string, value: string): void {
  if (renderCache.has(key)) renderCache.delete(key);
  renderCache.set(key, value);
  while (renderCache.size > RENDER_CACHE_LIMIT) {
    const oldest = renderCache.keys().next().value;
    if (oldest === undefined) break;
    renderCache.delete(oldest);
  }
}

export async function renderMarkdown(
  content: string,
  currentRelPath = ""
): Promise<string> {
  const cacheKey = renderCacheKey(currentRelPath, content);
  const cached = renderCacheGet(cacheKey);
  if (cached !== undefined) return cached;

  const preprocessed = preprocessTableBackslashBreaks(content);
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    // allowDangerousHtml: true → raw HTML(예: <br>)을 hast의 raw 노드로 통과.
    // 이후 rehypeRaw가 진짜 HTML 요소로 파싱하고, 마지막 sanitize가 안전 태그만 남긴다.
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeTableCellLists)
    .use(rehypeRewriteDocLinks(currentRelPath))
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(preprocessed);

  const html = String(file);
  renderCacheSet(cacheKey, html);
  return html;
}
