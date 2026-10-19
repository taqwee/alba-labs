import type { Config } from "tailwindcss";

/**
 * Every color comes from the CSS variables in app/globals.css.
 * To re-brand Lunomi Studio, change the variables there — nothing else.
 */
const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: token("primary"),
        "primary-fg": token("primary-fg"),
        secondary: token("secondary"),
        accent: token("accent"),
        "accent-fg": token("accent-fg"),
        background: token("background"),
        surface: token("surface"),
        text: token("text"),
        muted: token("muted"),
        border: token("border"),
        success: token("success"),
        warning: token("warning"),
        error: token("error"),
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-body)"],
      },
      maxWidth: { page: "72rem" },
    },
  },
  plugins: [],
};
export default config;
