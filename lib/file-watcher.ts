import { EventEmitter } from "events";
import {
  DOCS_ROOT,
  MEETING_MINUTES_DIR,
  IDEAS_FILE_PATH,
  WORKLOGS_DIR,
  PRESENTATIONS_DIR,
  WORK_DIR,
} from "./paths";

export interface FileChangeEvent {
  type: "docs" | "meetings" | "ideas" | "worklogs" | "presentations" | "work";
  path: string;
  timestamp: number;
}

class FileWatcher extends EventEmitter {
  private started = false;

  async start() {
    if (this.started) return;
    this.started = true;

    try {
      const chokidar = await import("chokidar");

      const watchTargets = [
        { paths: DOCS_ROOT, type: "docs" as const },
        { paths: MEETING_MINUTES_DIR, type: "meetings" as const },
        { paths: IDEAS_FILE_PATH, type: "ideas" as const },
        { paths: WORKLOGS_DIR, type: "worklogs" as const },
        { paths: PRESENTATIONS_DIR, type: "presentations" as const },
        { paths: WORK_DIR, type: "work" as const },
      ];

      for (const target of watchTargets) {
        try {
          const watcher = chokidar.watch(target.paths, {
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
          });

          const handler = (filePath: string) => {
            const event: FileChangeEvent = {
              type: target.type,
              path: filePath,
              timestamp: Date.now(),
            };
            this.emit("change", event);
          };

          watcher.on("add", handler);
          watcher.on("change", handler);
          watcher.on("unlink", handler);
        } catch {
          // 디렉토리가 없으면 무시
        }
      }

      console.log("[FlowDesk] 파일 감시 시작 (docs, meetings, ideas, worklogs, presentations, work)");
    } catch (err) {
      console.error("[FlowDesk] 파일 감시 시작 실패:", err);
      this.started = false;
    }
  }
}

// 싱글톤: 서버에서 한 번만 생성
const globalWatcher = (globalThis as Record<string, unknown>).__flowdesk_watcher as FileWatcher | undefined;
export const fileWatcher: FileWatcher = globalWatcher ?? new FileWatcher();
if (!globalWatcher) {
  (globalThis as Record<string, unknown>).__flowdesk_watcher = fileWatcher;
}
