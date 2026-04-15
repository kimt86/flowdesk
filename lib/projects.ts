import fs from "fs";
import { PROJECTS_FILE_PATH } from "./paths";

export interface Project {
  id: string;
  title: string;
  code: string;
  client: string;
  status: string;
  goal: string;
  owner: string;
  docsPath: string;
  highlights: string;
  milestones: string;
  rawContent: string;
  archived: boolean;
}

/** 마크다운 테이블 행에서 값 추출: | **키** | 값 | */
function parseTableRow(content: string, key: string): string {
  const regex = new RegExp(`\\|\\s*\\*\\*${key}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`);
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

/** ### 섹션 내용 추출 */
function parseSection(content: string, heading: string): string {
  const regex = new RegExp(`###\\s*${heading}[\\s\\S]*?(?=###|$)`, "m");
  const match = content.match(regex);
  if (!match) return "";
  return match[0]
    .replace(new RegExp(`###\\s*${heading}\\s*`), "")
    .trim();
}

export function parseProjects(): Project[] {
  let raw: string;
  try {
    raw = fs.readFileSync(PROJECTS_FILE_PATH, "utf-8");
  } catch {
    return [];
  }

  const projects: Project[] = [];

  // ## 헤딩 기준으로 분리
  const sections = raw.split(/^(?=## )/m).filter((s) => s.trim());

  // 🗄️ Archive 섹션 감지
  let inArchive = false;

  for (const section of sections) {
    const headingMatch = section.match(/^## (.+)/m);
    if (!headingMatch) continue;

    const heading = headingMatch[1].trim();

    // 헤더(# 프로젝트 현황)나 메타 섹션 건너뛰기
    if (heading.startsWith("#")) continue;

    // Archive 섹션 감지
    if (/archive/i.test(heading) || heading.includes("🗄️")) {
      inArchive = true;
      continue;
    }

    const code = parseTableRow(section, "프로젝트 코드");
    const id = code || heading.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").slice(0, 50);

    projects.push({
      id,
      title: heading,
      code,
      client: parseTableRow(section, "고객사"),
      status: parseTableRow(section, "상태"),
      goal: parseTableRow(section, "목표"),
      owner: parseTableRow(section, "담당"),
      docsPath: parseTableRow(section, "문서 위치"),
      highlights: parseSection(section, "주요 현황") || parseSection(section, "주요 진행 사항"),
      milestones: parseSection(section, "다음 마일스톤"),
      rawContent: section.trim(),
      archived: inArchive,
    });
  }

  return projects;
}

function serializeProjects(projects: Project[]): string {
  const header = "# 프로젝트 현황\n";
  const board = projects.filter((p) => !p.archived);
  const archive = projects.filter((p) => p.archived);

  let result = header + "\n";
  for (const p of board) {
    result += p.rawContent + "\n\n---\n\n";
  }

  if (archive.length > 0) {
    result += "## 🗄️ Archive\n\n";
    for (const p of archive) {
      result += p.rawContent + "\n\n---\n\n";
    }
  }

  return result;
}

export function addProject(title: string, code: string, client: string, goal: string, owner: string): string {
  const projects = parseProjects();
  const id = code || `proj-${Date.now()}`;

  const rawContent = [
    `## ${title}`,
    "",
    "| 항목 | 내용 |",
    "|------|------|",
    `| **프로젝트 코드** | ${id} |`,
    client ? `| **고객사** | ${client} |` : null,
    `| **상태** | 신규 |`,
    goal ? `| **목표** | ${goal} |` : null,
    owner ? `| **담당** | ${owner} |` : null,
    "",
    "### 주요 현황",
    "",
    "- (작성 예정)",
    "",
    "### 다음 마일스톤",
    "",
    "- (작성 예정)",
  ].filter((line) => line !== null).join("\n");

  projects.unshift({
    id, title, code: id, client, status: "신규", goal, owner,
    docsPath: "", highlights: "- (작성 예정)", milestones: "- (작성 예정)",
    rawContent, archived: false,
  });

  fs.writeFileSync(PROJECTS_FILE_PATH, serializeProjects(projects), "utf-8");
  return id;
}

export function updateProject(id: string, updates: { rawContent?: string; archived?: boolean }): boolean {
  const projects = parseProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return false;

  if (updates.rawContent !== undefined) {
    projects[idx].rawContent = updates.rawContent;
    // rawContent에서 메타데이터 재파싱
    projects[idx].title = projects[idx].rawContent.match(/^## (.+)/m)?.[1]?.trim() ?? projects[idx].title;
    projects[idx].status = parseTableRow(projects[idx].rawContent, "상태") || projects[idx].status;
  }
  if (updates.archived !== undefined) {
    projects[idx].archived = updates.archived;
  }

  fs.writeFileSync(PROJECTS_FILE_PATH, serializeProjects(projects), "utf-8");
  return true;
}

export function deleteProject(id: string): boolean {
  const projects = parseProjects();
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length === projects.length) return false;
  fs.writeFileSync(PROJECTS_FILE_PATH, serializeProjects(filtered), "utf-8");
  return true;
}
