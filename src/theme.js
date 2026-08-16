import { useState, useEffect } from "react";

export const THEMES = {
  light: {
    bg: "#F4F1E9",
    surface: "#EDEAE2",
    shadowD: "#c8c5bc",
    shadowL: "#ffffff",
    text1: "#3A362E",
    text2: "#9A9484",
    text3: "#C7C2B4",
    divider: "#DAD6CB",
    overlay: "rgba(58,54,46,0.35)",
    accent: "#1F7A5C",
    warn: "#E2A63B",
    warnText: "#B98A2E",
    danger: "#C1584B",
  },
  dark: {
    bg: "#1C1E22",
    surface: "#25282E",
    shadowD: "#15171B",
    shadowL: "#333740",
    text1: "#EDEAE2",
    text2: "#8E9199",
    text3: "#565A62",
    divider: "#33373E",
    overlay: "rgba(0,0,0,0.55)",
    accent: "#33B08A",
    warn: "#E8B458",
    warnText: "#E8B458",
    danger: "#E27A6C",
  },
};

export function useTheme() {
  const [mode, setMode] = useState(() => {
    if (typeof localStorage === "undefined") return "light";
    return localStorage.getItem("pa-theme") || "light";
  });

  useEffect(() => {
    try {
      localStorage.setItem("pa-theme", mode);
    } catch {
      // ignore (e.g. private browsing storage restrictions)
    }
  }, [mode]);

  const toggle = () => setMode((m) => (m === "light" ? "dark" : "light"));
  return { mode, colors: THEMES[mode], toggle };
}

// Turns a theme's color object into CSS custom properties for an inline style prop.
export function themeVars(colors) {
  return {
    "--bg": colors.bg,
    "--surface": colors.surface,
    "--shadow-d": colors.shadowD,
    "--shadow-l": colors.shadowL,
    "--text-1": colors.text1,
    "--text-2": colors.text2,
    "--text-3": colors.text3,
    "--divider": colors.divider,
    "--overlay": colors.overlay,
    "--accent": colors.accent,
    "--warn": colors.warn,
    "--warn-text": colors.warnText,
    "--danger": colors.danger,
  };
}

export const NEU_CSS = `
  .neu { background: var(--surface); border-radius: 20px; box-shadow: 8px 8px 16px var(--shadow-d), -8px -8px 16px var(--shadow-l); }
  .neu-in { background: var(--surface); border-radius: 16px; box-shadow: inset 6px 6px 12px var(--shadow-d), inset -6px -6px 12px var(--shadow-l); }
  .neu-btn { background: var(--surface); border-radius: 14px; box-shadow: 6px 6px 12px var(--shadow-d), -6px -6px 12px var(--shadow-l); transition: all .12s ease; cursor: pointer; border: none; }
  .neu-btn:active { box-shadow: inset 4px 4px 8px var(--shadow-d), inset -4px -4px 8px var(--shadow-l); }
  .neu-circle { background: var(--surface); border-radius: 50%; box-shadow: 6px 6px 12px var(--shadow-d), -6px -6px 12px var(--shadow-l); }
  .neu-circle.active { box-shadow: inset 4px 4px 8px var(--shadow-d), inset -4px -4px 8px var(--shadow-l); }
  .mono { font-family: 'Space Grotesk', monospace; }
  .display { font-family: 'Fraunces', serif; }
  .chip { transition: all .12s ease; }
`;
