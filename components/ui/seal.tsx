import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Seal — 단청 레드 도장. "Ritual of completion."
 * 작게는 브랜드 표식, 크게는 완료된 주간보고·아카이브 항목의 기념비적 표식.
 * 약간 기울어진 각도로 찍혀 실제 도장 감각.
 */

export interface SealProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** 14px sm (브랜드/inline), 24px md (리스트 표식), 40px lg (기념비) */
  size?: "sm" | "md" | "lg";
  /** 도장 속 글자 (1~2자 권장). 기본 "印" */
  glyph?: string;
  /** 기울기 각도 (deg). 기본 -4, 자연스럽게 찍힌 느낌 */
  rotate?: number;
}

const sizeMap: Record<
  NonNullable<SealProps["size"]>,
  { box: number; font: number }
> = {
  sm: { box: 14, font: 10 },
  md: { box: 24, font: 14 },
  lg: { box: 40, font: 22 },
};

export const Seal = React.forwardRef<HTMLSpanElement, SealProps>(
  (
    { size = "sm", glyph = "印", rotate = -4, className, style, ...props },
    ref,
  ) => {
    const { box, font } = sizeMap[size];
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center bg-accent text-surface shrink-0 select-none leading-none",
          className,
        )}
        style={{
          width: box,
          height: box,
          fontSize: font,
          fontFamily: '"Noto Serif KR", serif',
          fontWeight: 900,
          transform: `rotate(${rotate}deg)`,
          ...style,
        }}
        aria-hidden="true"
        {...props}
      >
        {glyph}
      </span>
    );
  },
);
Seal.displayName = "Seal";
