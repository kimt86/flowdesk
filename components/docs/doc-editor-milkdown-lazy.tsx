"use client";

import dynamic from "next/dynamic";
import type { DocMetadataInitial } from "@/components/docs/doc-metadata-editor";
import { EditorSkeleton } from "@/components/docs/editor-skeleton";

interface Props {
  relPath: string;
  initialBody: string;
  initialMeta: DocMetadataInitial;
}

/**
 * Milkdown/Crepe 번들(~200-400KB + CSS)을 lazy-load.
 * 첫 진입 시 EditorSkeleton 잠깐 보이고 chunk 로드 후 실제 에디터 마운트.
 * 다른 페이지(/docs, /docs/view 등)에는 milkdown chunk가 포함되지 않음.
 */
const DocEditorMilkdownInner = dynamic(
  () =>
    import("@/components/docs/doc-editor-milkdown").then(
      (m) => m.DocEditorMilkdown,
    ),
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  },
);

export function DocEditorMilkdownLazy({
  relPath,
  initialBody,
  initialMeta,
}: Props) {
  return (
    <DocEditorMilkdownInner
      relPath={relPath}
      initialBody={initialBody}
      initialMeta={initialMeta}
    />
  );
}

