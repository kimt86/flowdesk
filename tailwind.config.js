/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Surfaces */
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        "surface-2": "hsl(var(--surface-2))",

        /* Text */
        foreground: "hsl(var(--foreground))",
        "ink-soft": "hsl(var(--ink-soft))",

        /* Borders */
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        /* Semantic tokens */
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          soft: "hsl(var(--accent-soft))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warn: "hsl(var(--warn))",
        danger: "hsl(var(--danger))",
      },

      fontFamily: {
        sans: [
          "var(--font-aa-sans)",
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Noto Sans KR",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "var(--font-aa-display)",
          "Paperlogy",
          "Noto Serif KR",
          "serif",
        ],
        data: [
          "IBM Plex Sans KR",
          "Pretendard Variable",
          "Pretendard",
          "sans-serif",
        ],
        mono: [
          "IBM Plex Mono",
          "JetBrains Mono",
          "SF Mono",
          "Menlo",
          "monospace",
        ],
      },

      fontSize: {
        "3xs": ["0.625rem", { lineHeight: "1.4" }],       /* 10 */
        "2xs": ["0.6875rem", { lineHeight: "1.4" }],      /* 11 */
        xs: ["0.75rem", { lineHeight: "1.45" }],          /* 12 */
        sm: ["0.8438rem", { lineHeight: "1.5" }],         /* 13.5 */
        base: ["0.9375rem", { lineHeight: "1.6" }],       /* 15 */
        md: ["1rem", { lineHeight: "1.6" }],              /* 16 */
        lg: ["1.125rem", { lineHeight: "1.4" }],          /* 18 */
        xl: ["1.375rem", { lineHeight: "1.25" }],         /* 22 */
        "2xl": ["1.75rem", { lineHeight: "1.15" }],       /* 28 */
        "3xl": ["2.25rem", { lineHeight: "1.05" }],       /* 36 */
        "display-sm": ["3rem", { lineHeight: "0.95", letterSpacing: "-0.03em" }],    /* 48 */
        display: ["4.5rem", { lineHeight: "0.92", letterSpacing: "-0.04em" }],       /* 72 */
        "display-lg": ["6rem", { lineHeight: "0.9", letterSpacing: "-0.04em" }],     /* 96 */
      },

      letterSpacing: {
        display: "-0.04em",
        tight: "-0.02em",
        snug: "-0.005em",
        meta: "0.08em",
        wide: "0.12em",
      },

      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "2px",
        md: "4px",
        lg: "8px",
        full: "9999px",
      },

      spacing: {
        "2xs": "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "72px",
        "4xl": "96px",
      },

      transitionDuration: {
        micro: "80ms",
        short: "150ms",
        medium: "250ms",
        long: "400ms",
      },

      transitionTimingFunction: {
        "out-flow": "cubic-bezier(0, 0, 0.2, 1)",
        "in-flow": "cubic-bezier(0.4, 0, 1, 1)",
        "in-out-flow": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
