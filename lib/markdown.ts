import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import type { Schema } from "hast-util-sanitize";
import path from "path";

// GFM 체크리스트(input[type=checkbox])를 sanitize에서 허용하는 스키마
const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    input: [["type", "checkbox"], ["disabled", true]],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "input"],
};

/**
 * 마크다운 내 상대경로 .md 링크를 /docs/view?path=... 형태로 리라이팅하는 rehype 플러그인.
 * currentRelPath: 현재 문서의 workspaceRoot 기준 상대경로 (예: "dev-docs\logic\doc.md")
 */
function rehypeRewriteDocLinks(currentRelPath: string) {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const href = node.properties?.href;
      if (typeof href !== "string") return;

      // http/https/mailto 등 외부 링크는 건드리지 않음
      if (/^[a-z][a-z0-9+\-.]*:/i.test(href)) return;
      // 앵커 링크(#...) 건드리지 않음
      if (href.startsWith("#")) return;
      // .md 파일 링크만 처리
      if (!href.endsWith(".md")) return;

      // 현재 문서의 디렉토리를 기준으로 상대경로 해석
      // currentRelPath: "dev-docs\logic\design\doc.md" (Windows 경로)
      const currentDir = path.dirname(currentRelPath.replace(/\\/g, "/"));
      const resolved = path.posix.normalize(
        path.posix.join(currentDir, href)
      );

      // /docs/view?path=<resolved> 형태로 변환
      node.properties.href = `/docs/view?path=${encodeURIComponent(resolved)}`;
    });
  };
}

export async function renderMarkdown(
  content: string,
  currentRelPath = ""
): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeRewriteDocLinks(currentRelPath))
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(content);
  return String(file);
}
