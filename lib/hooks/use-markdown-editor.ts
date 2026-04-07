import { RefObject } from "react";

type InsertFn = (text: string) => void;

function getInsertFn(
  ref: RefObject<HTMLTextAreaElement>,
  onChange: (value: string) => void
): InsertFn {
  return (text: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // execCommand preserves the native undo stack
    const success = document.execCommand("insertText", false, text);
    if (!success) {
      // fallback: direct manipulation (breaks undo)
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = el.value.slice(0, start);
      const after = el.value.slice(end);
      const next = before + text + after;
      el.value = next;
      el.selectionStart = el.selectionEnd = start + text.length;
      onChange(next);
    } else {
      onChange(el.value);
    }
  };
}

export function useMarkdownEditor(
  ref: RefObject<HTMLTextAreaElement>,
  onChange: (value: string) => void
) {
  function wrapSelection(before: string, after: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);
    const insert = getInsertFn(ref, onChange);

    if (selected) {
      insert(before + selected + after);
      // reposition cursor inside the markers
      requestAnimationFrame(() => {
        if (!el) return;
        el.selectionStart = start + before.length;
        el.selectionEnd = start + before.length + selected.length;
      });
    } else {
      insert(before + after);
      requestAnimationFrame(() => {
        if (!el) return;
        el.selectionStart = el.selectionEnd = start + before.length;
      });
    }
  }

  function prependLine(prefix: string) {
    const el = ref.current;
    if (!el) return;
    const pos = el.selectionStart;
    const lineStart = el.value.lastIndexOf("\n", pos - 1) + 1;
    const lineEnd = el.value.indexOf("\n", pos);
    const line = el.value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

    // toggle: remove prefix if already present
    if (line.startsWith(prefix)) {
      el.selectionStart = lineStart;
      el.selectionEnd = lineStart + prefix.length;
      getInsertFn(ref, onChange)("");
    } else {
      el.selectionStart = lineStart;
      el.selectionEnd = lineStart;
      getInsertFn(ref, onChange)(prefix);
    }
  }

  function insertAtCursor(text: string) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    getInsertFn(ref, onChange)(text);
  }

  function insertLink() {
    const el = ref.current;
    if (!el) return;
    const selected = el.value.slice(el.selectionStart, el.selectionEnd);
    const text = selected || "링크 텍스트";
    const insert = getInsertFn(ref, onChange);
    const start = el.selectionStart;
    insert(`[${text}](url)`);
    // select "url" for easy replacement
    requestAnimationFrame(() => {
      if (!el) return;
      const urlStart = start + text.length + 3; // "[text](" = text.length + 3
      el.selectionStart = urlStart;
      el.selectionEnd = urlStart + 3; // "url"
    });
  }

  function insertTable() {
    insertAtCursor(
      "\n| 제목1 | 제목2 | 제목3 |\n| --- | --- | --- |\n| 내용 | 내용 | 내용 |\n"
    );
  }

  function insertCodeBlock() {
    const el = ref.current;
    if (!el) return;
    const selected = el.value.slice(el.selectionStart, el.selectionEnd);
    const start = el.selectionStart;
    if (selected) {
      getInsertFn(ref, onChange)("```\n" + selected + "\n```");
    } else {
      getInsertFn(ref, onChange)("```\n\n```");
      requestAnimationFrame(() => {
        if (!el) return;
        el.selectionStart = el.selectionEnd = start + 4; // inside the code block
      });
    }
  }

  function insertHorizontalRule() {
    insertAtCursor("\n---\n");
  }

  function indentSelection() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
    el.selectionStart = lineStart;
    el.selectionEnd = lineStart;
    getInsertFn(ref, onChange)("  ");
  }

  function dedentSelection() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
    const twoSpaces = el.value.slice(lineStart, lineStart + 2);
    if (twoSpaces === "  ") {
      el.selectionStart = lineStart;
      el.selectionEnd = lineStart + 2;
      getInsertFn(ref, onChange)("");
    }
  }

  return {
    bold: () => wrapSelection("**", "**"),
    italic: () => wrapSelection("_", "_"),
    strikethrough: () => wrapSelection("~~", "~~"),
    inlineCode: () => wrapSelection("`", "`"),
    heading: (level: 1 | 2 | 3 | 4) => prependLine("#".repeat(level) + " "),
    bulletList: () => prependLine("- "),
    orderedList: () => prependLine("1. "),
    checklist: () => prependLine("- [ ] "),
    blockquote: () => prependLine("> "),
    insertCodeBlock,
    insertLink,
    insertTable,
    insertHorizontalRule,
    indentSelection,
    dedentSelection,
    insertAtCursor,
  };
}
