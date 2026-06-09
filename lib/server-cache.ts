/**
 * 서버 사이드 in-memory 싱글톤 캐시.
 *
 * Next.js 13.5 dev/prod 모두 단일 Node.js 프로세스에서 실행되므로 모듈 레벨
 * Map으로 충분. file-watcher 이벤트로 무효화되어 일관성 보장 (lib/cache-invalidator.ts).
 *
 * 사용 패턴:
 *   const docs = getOrSet("docs:all", () => scanDocs(DOCS_ROOT, WORKSPACE_ROOT));
 *   invalidate("docs:all");        // 정확 일치
 *   invalidatePrefix("docs:");     // prefix 일괄
 */

// HMR 사이에서도 살아남도록 globalThis에 저장
const GLOBAL_KEY = "__flowdesk_server_cache__";

interface CacheStore {
  data: Map<string, unknown>;
}

function getStore(): CacheStore {
  const g = globalThis as unknown as Record<string, CacheStore | undefined>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { data: new Map() };
  }
  return g[GLOBAL_KEY]!;
}

export function getOrSet<T>(key: string, compute: () => T): T {
  const store = getStore();
  if (store.data.has(key)) {
    return store.data.get(key) as T;
  }
  const value = compute();
  store.data.set(key, value);
  return value;
}

export function get<T>(key: string): T | undefined {
  return getStore().data.get(key) as T | undefined;
}

export function set<T>(key: string, value: T): void {
  getStore().data.set(key, value);
}

export function invalidate(key: string): boolean {
  return getStore().data.delete(key);
}

export function invalidatePrefix(prefix: string): number {
  const store = getStore();
  const toDelete: string[] = [];
  store.data.forEach((_, k) => {
    if (k.startsWith(prefix)) toDelete.push(k);
  });
  for (const k of toDelete) store.data.delete(k);
  return toDelete.length;
}

export function clear(): void {
  getStore().data.clear();
}

export function size(): number {
  return getStore().data.size;
}
