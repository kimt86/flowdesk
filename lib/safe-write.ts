// FlowDesk — 안전한 파일 쓰기 유틸(백업 + 원자적 쓰기).
// AI 비서가 사용자 데이터(.md)를 수정·삭제하므로, 모든 lib write 지점이 이 유틸을 거쳐
// (1) 기존 파일을 .flowdesk-trash 에 백업하고 (2) temp+rename 으로 원자적으로 쓴다.
// fs.writeFileSync(p, c, "utf-8") 호출을 그대로 치환할 수 있도록 세 번째 인자를 받아 무시한다.
import fs from "fs";
import path from "path";
import { WORKSPACE_ROOT } from "./paths";

const TRASH_DIR = path.join(WORKSPACE_ROOT, ".flowdesk-trash");
const MAX_BACKUPS_PER_FILE = 5;

function backupPrefix(absPath: string): string {
  const rel = path.relative(WORKSPACE_ROOT, absPath) || path.basename(absPath);
  return rel.split(path.sep).join("__");
}

/** 같은 원본의 백업이 MAX를 넘으면 오래된 것부터 제거(타임스탬프 사전순). */
function pruneBackups(prefix: string): void {
  try {
    const entries = fs
      .readdirSync(TRASH_DIR)
      .filter((f) => f.startsWith(prefix + ".") && f.endsWith(".bak"))
      .sort();
    while (entries.length > MAX_BACKUPS_PER_FILE) {
      const old = entries.shift();
      if (old) fs.rmSync(path.join(TRASH_DIR, old), { force: true });
    }
  } catch {
    /* 정리 실패는 무시 */
  }
}

/** 기존 파일이 있으면 .flowdesk-trash 에 타임스탬프 사본 백업. 실패는 쓰기를 막지 않음. */
function backup(absPath: string): void {
  if (!fs.existsSync(absPath)) return;
  try {
    fs.mkdirSync(TRASH_DIR, { recursive: true });
    const prefix = backupPrefix(absPath);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    fs.copyFileSync(absPath, path.join(TRASH_DIR, `${prefix}.${ts}.bak`));
    pruneBackups(prefix);
  } catch {
    /* 백업 실패가 본 쓰기를 막지 않는다 */
  }
}

/** 백업 후 원자적으로 파일을 쓴다(temp → rename). 중간 디렉토리 자동 생성. */
export function safeWriteFile(
  absPath: string,
  content: string,
  _enc?: BufferEncoding,
): void {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  backup(absPath);
  const tmp = `${absPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, content, "utf-8");
  fs.renameSync(tmp, absPath);
}

/** 백업 후 파일을 삭제한다. */
export function safeDeleteFile(absPath: string): void {
  backup(absPath);
  fs.unlinkSync(absPath);
}
