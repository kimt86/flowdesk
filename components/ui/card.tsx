import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Card — 인덱스카드 감각. 헤어라인 1px, 그림자 금지, radius 2px.
 * urgent prop으로 좌측 단청 레드 보더.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  urgent?: boolean;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, urgent, interactive, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "border border-border bg-surface rounded-sm p-md transition-colors duration-short ease-out-flow",
        urgent && "border-l-[3px] border-l-accent pl-[calc(theme(spacing.md)-2px)]",
        interactive && "hover:border-border-strong cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mb-2 space-y-0.5", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-sans font-medium text-md leading-tight tracking-snug text-foreground",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardMeta = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mono-meta flex flex-wrap gap-x-3 gap-y-1", className)}
    {...props}
  />
));
CardMeta.displayName = "CardMeta";

export const CardBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-foreground leading-relaxed", className)}
    {...props}
  />
));
CardBody.displayName = "CardBody";
