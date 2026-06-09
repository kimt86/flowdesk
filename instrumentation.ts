// Next.js instrumentation hook — 서버(Node 런타임) 부팅 시 1회 실행.
// Phase 3: file-watcher와 cache-invalidator를 SSE 첫 연결과 무관하게 명시적으로 기동해
// "특정 API를 한 번 치기 전까지 외부 파일 변경이 화면에 반영 안 되는" 잠복 버그를 제거한다.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { fileWatcher } = await import("./lib/file-watcher");
    const { registerCacheInvalidator } = await import("./lib/cache-invalidator");
    registerCacheInvalidator();
    await fileWatcher.start();
    console.log(
      "[FlowDesk] instrumentation: file-watcher + cache-invalidator 부팅 초기화 완료",
    );
  }
}
