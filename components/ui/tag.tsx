import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Tag — IBM Plex Mono, uppercase, 헤어라인 테두리.
 * PROJECT · URGENT · DONE 같은 메타데이터 레이블.
 */
const tagVariants = cva(
  "inline-flex items-center font-mono text-2xs uppercase tracking-meta tabular-nums px-2 py-0.5 border rounded-none whitespace-nowrap",
  {
    variants: {
      tone: {
        default: "border-border-strong text-ink-soft bg-transparent",
        accent: "border-accent text-accent bg-transparent",
        success: "border-success text-success bg-transparent",
        warn: "border-warn text-warn bg-transparent",
        danger: "border-danger text-danger bg-transparent",
        filled: "border-foreground bg-foreground text-background",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, tone, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(tagVariants({ tone }), className)}
      {...props}
    />
  ),
);
Tag.displayName = "Tag";

export { tagVariants };
