// FlowDesk AI 비서 — 승인 대기 레지스트리.
// 라우트(SSE)가 permission_request를 보내고, 별도 /api/assistant/approve POST가 결정을 회신한다.
// 단일 로컬 사용자(standalone 서버 단일 프로세스)라 in-memory Map으로 충분.
type Resolver = (approved: boolean) => void;

const pending = new Map<string, Resolver>();

/** 승인 대기 Promise를 등록. signal abort 시 자동 deny. */
export function waitForApproval(requestId: string, signal?: AbortSignal): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    pending.set(requestId, resolve);
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          if (pending.delete(requestId)) resolve(false);
        },
        { once: true },
      );
    }
  });
}

/** 대기 중인 요청을 해소(allow/deny). 해당 id가 없으면 false. */
export function resolveApproval(requestId: string, approved: boolean): boolean {
  const r = pending.get(requestId);
  if (!r) return false;
  pending.delete(requestId);
  r(approved);
  return true;
}
