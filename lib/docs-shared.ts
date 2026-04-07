// 클라이언트/서버 모두에서 import 가능한 공유 상수/타입
// Node.js 모듈(fs, path 등)을 절대 import하지 않아야 함

export const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  review: "검토중",
  final: "완료",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-700",
  review: "bg-blue-100 text-blue-700",
  final: "bg-green-100 text-green-700",
};

export interface DocMeta {
  filePath: string;
  relPath: string;
  title: string;
  status: string;
  created: string;
  updated: string;
  author: string;
  tags: string[];
}
