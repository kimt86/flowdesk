import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Alert — 좌측 3px semantic 보더 + surface-2 배경.
 * mono uppercase icon 텍스트가 타입을 알려준다.
 */
const alertVariants = cva(
  "flex gap-sm items-start px-md py-sm bg-surface-2 border-l-[3px] rounded-none text-sm leading-relaxed",
  {
    variants: {
      tone: {
        info: "border-foreground",
        success: "border-success",
        warn: "border-warn",
        danger: "border-danger",
      },
    },
    defaultVariants: {
      tone: "info",
    },
  },
);

const iconLabel: Record<NonNullable<AlertProps["tone"]>, string> = {
  info: "INFO",
  success: "DONE",
  warn: "WARN",
  danger: "FAIL",
};

const iconColor: Record<NonNullable<AlertProps["tone"]>, string> = {
  info: "text-foreground",
  success: "text-success",
  warn: "text-warn",
  danger: "text-danger",
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: string; // override the default icon label
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone = "info", icon, children, ...props }, ref) => {
    const effectiveTone = tone ?? "info";
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ tone }), className)}
        {...props}
      >
        <span
          className={cn(
            "font-mono text-2xs uppercase tracking-meta font-semibold pt-0.5 shrink-0",
            iconColor[effectiveTone],
          )}
        >
          {icon ?? iconLabel[effectiveTone]}
        </span>
        <span className="text-foreground">{children}</span>
      </div>
    );
  },
);
Alert.displayName = "Alert";

export { alertVariants };
