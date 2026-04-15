import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Button — FlowDesk "한지와 먹"
 * radius 2px · 헤어라인 테두리 · 그림자 금지
 * Hover 시 primary는 accent로 전환 (단청 레드 활용 모먼트)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium tracking-snug transition-colors duration-short ease-out-flow disabled:opacity-40 disabled:cursor-not-allowed rounded-sm focus-visible:outline-2 focus-visible:outline focus-visible:outline-accent focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-foreground text-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-surface text-foreground border border-border-strong hover:border-foreground",
        ghost: "bg-transparent text-foreground hover:bg-surface-2",
        danger:
          "bg-transparent text-danger border border-danger hover:bg-danger hover:text-background",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-5 text-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
