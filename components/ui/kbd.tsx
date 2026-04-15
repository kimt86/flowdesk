import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Kbd — 키보드 단축키 힌트. IBM Plex Mono, 헤어라인 박스.
 * 여러 키를 KbdSequence로 묶을 수 있음.
 */
export const Kbd = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => (
  <kbd
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 border border-border-strong bg-surface text-foreground font-mono text-2xs leading-none tracking-normal",
      className,
    )}
    {...props}
  >
    {children}
  </kbd>
));
Kbd.displayName = "Kbd";

export interface KbdSequenceProps extends React.HTMLAttributes<HTMLSpanElement> {
  keys: string[];
  separator?: string;
}

/*
 * KbdSequence — keys 배열을 받아 <Kbd> 묶음으로 렌더.
 * 예: <KbdSequence keys={["⌘", "K"]} />
 */
export function KbdSequence({
  keys,
  separator,
  className,
  ...props
}: KbdSequenceProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} {...props}>
      {keys.map((k, i) => (
        <React.Fragment key={`${k}-${i}`}>
          <Kbd>{k}</Kbd>
          {separator && i < keys.length - 1 && (
            <span className="mono-meta">{separator}</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}
