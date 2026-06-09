"use client";

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";

export interface MilkdownEditorHandle {
  /** 에디터에서 현재 마크다운을 동기적으로 가져옴 */
  getMarkdown: () => string;
}

interface InnerProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
}

/**
 * Crepe 기반 WYSIWYG 에디터.
 * 슬래시 명령(/), 표 도구, 링크 툴팁, 블록 핸들 등 풀 UI 포함.
 */
const InnerEditor = forwardRef<MilkdownEditorHandle, InnerProps>(
  function InnerEditor({ initialMarkdown, onChange }, ref) {
    const crepeRef = useRef<Crepe | null>(null);
    const markdownRef = useRef(initialMarkdown);

    useEditor((root) => {
      const crepe = new Crepe({
        root,
        defaultValue: initialMarkdown,
      });
      crepe.on((api) => {
        api.markdownUpdated((_ctx, md) => {
          markdownRef.current = md;
          onChange(md);
        });
      });
      crepeRef.current = crepe;
      return crepe;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getMarkdown: () =>
          crepeRef.current?.getMarkdown() ?? markdownRef.current,
      }),
      [],
    );

    return <Milkdown />;
  },
);

interface Props {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
}

export const MilkdownDocEditor = forwardRef<MilkdownEditorHandle, Props>(
  function MilkdownDocEditor({ initialMarkdown, onChange }, ref) {
    return (
      <MilkdownProvider>
        <InnerEditor
          initialMarkdown={initialMarkdown}
          onChange={onChange}
          ref={ref}
        />
      </MilkdownProvider>
    );
  },
);
