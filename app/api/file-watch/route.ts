import { fileWatcher, type FileChangeEvent } from "@/lib/file-watcher";
import { registerCacheInvalidator } from "@/lib/cache-invalidator";

export const dynamic = "force-dynamic";

export async function GET() {
  // 감시 시작 (이미 시작된 경우 무시) + 캐시 무효화 리스너 등록 (1회성)
  fileWatcher.start();
  registerCacheInvalidator();

  const encoder = new TextEncoder();

  let cleanupFn: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 연결 확인용 초기 메시지
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"));

      const handler = (event: FileChangeEvent) => {
        try {
          const data = JSON.stringify({
            type: event.type,
            path: event.path,
            timestamp: event.timestamp,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // 연결 끊어진 경우 무시
        }
      };

      fileWatcher.on("change", handler);

      // 30초마다 keepalive
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 30000);

      // 클린업 함수 등록 (cancel에서 호출)
      cleanupFn = () => {
        fileWatcher.off("change", handler);
        clearInterval(keepalive);
      };
    },
    cancel() {
      cleanupFn?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
