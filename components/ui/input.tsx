import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Input — underline-only, no box, no radius.
 * 포커스 시 하단선이 단청 레드로 전환.
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "w-full bg-transparent border-0 border-b border-border-strong px-0 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-accent transition-colors duration-short ease-out-flow disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

/*
 * InputLabel — mono uppercase meta label above Input.
 */
export const InputLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("mono-meta block mb-1.5", className)}
    {...props}
  />
));
InputLabel.displayName = "InputLabel";

/*
 * InputGroup — wraps label + input with consistent spacing.
 */
export function InputGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col", className)} {...props} />;
}

/*
 * Textarea — same underline treatment, multi-row.
 */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full bg-transparent border-0 border-b border-border-strong px-0 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-accent transition-colors duration-short ease-out-flow resize-y disabled:opacity-40",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
