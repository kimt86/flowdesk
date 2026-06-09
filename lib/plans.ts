import fs from "fs";
import path from "path";
import { DOCS_ROOT, plansDir } from "./paths";
import { renderMarkdown } from "./markdown";
import { getOrSet } from "./server-cache";

export interface PlanMeta {
  filename: string;
  title: string;
  author: string;
  date: string;
  status: string; // "draft" | "review" | "final"
  tags: string[];
  phases: { number: number; title: string }[];
}

export interface PlanDetail extends PlanMeta {
  body: string;   // raw markdown (body after metadata)
  html: string;   // rendered HTML
}

/** Parse backtick-wrapped tags: `t1` `t2` → ["t1", "t2"] */
function parseTags(raw: string): string[] {
  const matches = raw.match(/`([^`]+)`/g);
  if (!matches) return [];
  return matches.map((t) => t.replace(/`/g, "").trim());
}

/**
 * Parse plan metadata from markdown content.
 * Expects:
 *   # Title
 *   > 작성자: ...
 *   > 작성일: ...
 *   > 상태: ...
 *   > 태그: `t1` `t2`
 *   ## Phase 1: ...
 */
export function parsePlanMeta(content: string, filename: string): PlanMeta {
  // Title from first # heading
  const titleMatch = content.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.md$/, "");

  // Blockquote metadata
  const authorMatch = content.match(/^>\s*작성자:\s*(.+)/m);
  const author = authorMatch ? authorMatch[1].trim() : "";

  const dateMatch = content.match(/^>\s*작성일:\s*(.+)/m);
  const date = dateMatch ? dateMatch[1].trim() : "";

  const statusMatch = content.match(/^>\s*상태:\s*(.+)/m);
  const status = statusMatch ? statusMatch[1].trim() : "draft";

  const tagsMatch = content.match(/^>\s*태그:\s*(.+)/m);
  const tags = tagsMatch ? parseTags(tagsMatch[1]) : [];

  // Phases: ## Phase 1: Title  or  ## Phase 1
  const phases: { number: number; title: string }[] = [];
  const phaseRegex = /^##\s+Phase\s+(\d+)(?::\s*(.+))?/gm;
  let m: RegExpExecArray | null;
  while ((m = phaseRegex.exec(content)) !== null) {
    phases.push({
      number: parseInt(m[1], 10),
      title: m[2] ? m[2].trim() : "",
    });
  }

  return { filename, title, author, date, status, tags, phases };
}

/**
 * List all plan files for a project, sorted by date descending.
 */
export function getCachedPlans(projectId: string): PlanMeta[] {
  return getOrSet(`listPlans:${projectId}`, () => listPlans(projectId));
}

export function listPlans(projectId: string): PlanMeta[] {
  const dir = plansDir(projectId);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: PlanMeta[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    try {
      const content = fs.readFileSync(path.join(dir, entry.name), "utf-8");
      results.push(parsePlanMeta(content, entry.name));
    } catch {
      // skip unreadable files
    }
  }

  // Sort by date descending
  results.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.filename.localeCompare(b.filename);
  });

  return results;
}

/**
 * Read a plan file and return full detail with rendered HTML.
 * Returns null if file not found or path is outside DOCS_ROOT.
 */
export async function readPlanDetail(
  projectId: string,
  filename: string
): Promise<PlanDetail | null> {
  // Security: validate path stays within DOCS_ROOT
  const dir = plansDir(projectId);
  const resolved = path.resolve(dir, filename);
  if (!resolved.startsWith(DOCS_ROOT + path.sep) && resolved !== DOCS_ROOT) {
    return null;
  }
  if (!resolved.endsWith(".md")) return null;

  let content: string;
  try {
    content = fs.readFileSync(resolved, "utf-8");
  } catch {
    return null;
  }

  const meta = parsePlanMeta(content, filename);

  // Body: everything after the blockquote metadata block.
  // Find where blockquote lines end (consecutive lines starting with >)
  const lines = content.split("\n");
  let bodyStartIndex = 0;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Skip initial heading
    if (!inBlockquote && trimmed.startsWith("# ")) {
      continue;
    }
    if (trimmed.startsWith(">")) {
      inBlockquote = true;
      continue;
    }
    if (inBlockquote && trimmed === "") {
      // blank line after blockquote — body starts after this
      bodyStartIndex = i + 1;
      break;
    }
    if (inBlockquote) {
      // non-blockquote, non-empty line after blockquote
      bodyStartIndex = i;
      break;
    }
  }

  // If we never found a blockquote, body is everything after the title
  if (!inBlockquote) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("# ")) {
        bodyStartIndex = i + 1;
        break;
      }
    }
  }

  const body = lines.slice(bodyStartIndex).join("\n").trim();
  const relPath = path.relative(DOCS_ROOT, resolved).replace(/\\/g, "/");
  const html = await renderMarkdown(body, relPath);

  return { ...meta, body, html };
}
