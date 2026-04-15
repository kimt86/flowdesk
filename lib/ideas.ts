import fs from "fs";
import { IDEAS_FILE_PATH } from "./paths";

export interface Idea {
  id: string;
  title: string;
  content: string;
  tags: string[];
  date: string;
  status: "board" | "archive";
}

/** IDEAS.md를 파싱하여 Idea 배열 반환 */
export function parseIdeas(): Idea[] {
  let raw: string;
  try {
    raw = fs.readFileSync(IDEAS_FILE_PATH, "utf-8");
  } catch {
    return [];
  }

  const ideas: Idea[] = [];
  // --- 구분자로 분리한 YAML 블록 추출
  const blocks = raw.split(/^---$/m).filter((b) => b.trim());

  for (const block of blocks) {
    // 헤딩(# Idea Board)이나 빈 블록 건너뛰기
    if (block.trim().startsWith("#") || !block.includes("title:")) continue;

    try {
      const get = (key: string): string => {
        const match = block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
        return match ? match[1].trim() : "";
      };

      const tagsRaw = get("tags");
      let tags: string[] = [];
      if (tagsRaw) {
        const arrMatch = tagsRaw.match(/\[([^\]]*)\]/);
        if (arrMatch) {
          tags = arrMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
        }
      }

      const id = get("id");
      const title = get("title");
      if (!id || !title) continue;

      ideas.push({
        id,
        title,
        content: get("content"),
        tags,
        date: get("date"),
        status: get("status") === "archive" ? "archive" : "board",
      });
    } catch {
      // 파싱 실패 시 skip
    }
  }

  return ideas;
}

/** IDEAS.md 전체를 Idea 배열로부터 재생성 */
function serializeIdeas(ideas: Idea[]): string {
  const header = "# Idea Board\n";
  const blocks = ideas.map((idea) => {
    const tags = idea.tags.length > 0 ? `[${idea.tags.join(", ")}]` : "[]";
    return [
      "---",
      `id: ${idea.id}`,
      `title: ${idea.title}`,
      `content: ${idea.content}`,
      `tags: ${tags}`,
      `date: ${idea.date}`,
      `status: ${idea.status}`,
      "---",
    ].join("\n");
  });

  return header + "\n" + blocks.join("\n\n") + "\n";
}

/** 새 아이디어 추가 */
export function addIdea(title: string, content: string, tags: string[]): string {
  const ideas = parseIdeas();
  const id = `idea-${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);

  ideas.unshift({ id, title, content, tags, date: today, status: "board" });
  fs.writeFileSync(IDEAS_FILE_PATH, serializeIdeas(ideas), "utf-8");
  return id;
}

/** 아이디어 수정 */
export function updateIdea(
  id: string,
  updates: Partial<Pick<Idea, "title" | "content" | "tags" | "status">>
): boolean {
  const ideas = parseIdeas();
  const idx = ideas.findIndex((i) => i.id === id);
  if (idx === -1) return false;

  if (updates.title !== undefined) ideas[idx].title = updates.title;
  if (updates.content !== undefined) ideas[idx].content = updates.content;
  if (updates.tags !== undefined) ideas[idx].tags = updates.tags;
  if (updates.status !== undefined) ideas[idx].status = updates.status;

  fs.writeFileSync(IDEAS_FILE_PATH, serializeIdeas(ideas), "utf-8");
  return true;
}

/** 아이디어 삭제 */
export function deleteIdea(id: string): boolean {
  const ideas = parseIdeas();
  const filtered = ideas.filter((i) => i.id !== id);
  if (filtered.length === ideas.length) return false;

  fs.writeFileSync(IDEAS_FILE_PATH, serializeIdeas(filtered), "utf-8");
  return true;
}
