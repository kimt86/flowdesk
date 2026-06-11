/**
 * file-watcher 이벤트 → server-cache 무효화 브릿지.
 *
 * file-watcher의 emit("change", { type, path, ... })를 받아 해당 도메인의
 * 캐시 키만 정확히 invalidate한다. 일관성 보장 + 무관 캐시는 hit 유지.
 *
 * 부팅 시 한 번만 등록되도록 globalThis 가드.
 */

import type { FileChangeEvent } from "./file-watcher";
import { fileWatcher } from "./file-watcher";
import { invalidate, invalidatePrefix } from "./server-cache";

const REGISTERED_KEY = "__flowdesk_invalidator_registered__";

// type → 무효화할 캐시 키들
const TYPE_TO_KEYS: Record<FileChangeEvent["type"], string[]> = {
  docs: ["scanDocs:default"],
  meetings: ["scanMeetings:default"],
  work: ["scanWork:default"],
  worklogs: ["scanWorklogs:default"],
  presentations: ["scanPresentations:default"],
  ideas: [], // ideas는 별도 캐시 없음 — list 페이지가 단일 파일 read만 함
  todo: [], // today/archive는 캐시 없이 매번 파일 read — SSE refresh만으로 충분
  projects: [], // PROJECTS.md도 매번 read
};

// type별 추가로 prefix invalidate (예: docs 변경 시 plans 캐시도 영향)
// renderMarkdown은 content hash 기반이라 자동으로 stale 처리되므로 invalidate 불필요.
const TYPE_TO_PREFIXES: Partial<Record<FileChangeEvent["type"], string[]>> = {
  docs: ["listPlans:"], // plans는 docs/<project>/plans/ 하위
};

function handleChange(event: FileChangeEvent): void {
  const keys = TYPE_TO_KEYS[event.type] ?? [];
  for (const key of keys) invalidate(key);

  const prefixes = TYPE_TO_PREFIXES[event.type] ?? [];
  for (const prefix of prefixes) invalidatePrefix(prefix);
}

export function registerCacheInvalidator(): void {
  const g = globalThis as unknown as Record<string, boolean | undefined>;
  if (g[REGISTERED_KEY]) return;
  g[REGISTERED_KEY] = true;
  fileWatcher.on("change", handleChange);
}
