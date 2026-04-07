"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DocDeleteButton({ relPath }: { relPath: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/docs?path=${encodeURIComponent(relPath)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/docs");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">정말 삭제할까요?</span>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2.5 py-1 border border-border rounded-md hover:bg-muted transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {deleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:text-red-500 hover:border-red-300 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
      삭제
    </button>
  );
}
