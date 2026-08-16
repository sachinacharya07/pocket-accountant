import { useState, useEffect } from "react";

// Glassmorphism theme: vivid gradient backdrop + frosted, blurred cards.
export const THEMES = {
  light: {
    bg: "linear-gradient(135deg, #0FA968 0%, #34C495 30%, #62C6D9 60%, #F2B84B 100%)",
    glassBg: "rgba(255,255,255,0.18)",
    glassBgStrong: "rgba(255,255,255,0.30)",
    glassWell: "rgba(0,0,0,0.14)",
    glassBorder: "rgba(255,255,255,0.38)",
    shadowD: "rgba(15,23,42,0.22)",
    text1: "#FFFFFF",
    text2: "rgba(255,255,255,0.80)",
    text3: "rgba(255,255,255,0.52)",
    divider: "rgba(255,255,255,0.30)",
    overlay: "rgba(15,23,42,0.50)",
    accent: "#FFD166",
    warn: "#FFB84D",
    warnText: "#FFF1D6",
    danger: "#FF6B6B",
  },
  dark: {
    bg: "linear-gradient(135deg, #0B1220 0%, #101B2E 30%, #123B3E 65%, #0F2E2A 100%)",
    glassBg: "rgba(255,255,255,0.07)",
    glassBgStrong: "rgba(255,255,255,0.12)",
    glassWell: "rgba(0,0,0,0.35)",
    glassBorder: "rgba(255,255,255,0.15)",
    shadowD: "rgba(0,0,0,0.55)",
    text1: "#F1F5F9",
    text2: "rgba(241,245,249,0.70)",
    text3: "rgba(241,245,249,0.44)",
    divider: "rgba(255,255,255,0.15)",
    overlay: "rgba(0,0,0,0.65)",
    accent: "#5EEAD4",
    warn: "#FBBF24",
    warnText: "#FDE68A",
    danger: "#FB7185",
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
    "--glass-bg": colors.glassBg,
    "--glass-bg-strong": colors.glassBgStrong,
    "--glass-well": colors.glassWell,
    "--glass-border": colors.glassBorder,
    "--shadow-d": colors.shadowD,
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

// Same class names as before (.neu, .neu-in, .neu-btn, .neu-circle) so no JSX
// had to change — only what they render changed, from neumorphic soft-shadow
// cards to frosted glass panels.
export const GLASS_CSS = `
  .neu {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    box-shadow: 0 8px 32px var(--shadow-d);
  }
  .neu-in {
    background: var(--glass-well);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
  .neu-btn {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 14px;
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    box-shadow: 0 6px 20px var(--shadow-d);
    transition: all .15s ease;
    cursor: pointer;
  }
  .neu-btn:active {
    transform: scale(0.97);
    background: color-mix(in srgb, var(--accent) 20%, var(--glass-bg));
  }
  .neu-circle {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 50%;
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    box-shadow: 0 4px 14px var(--shadow-d);
  }
  .neu-circle.active {
    background: color-mix(in srgb, var(--accent) 32%, var(--glass-bg));
    border: 1px solid var(--accent);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent) 55%, transparent);
  }
  .mono { font-family: 'Space Grotesk', monospace; }
  .display { font-family: 'Fraunces', serif; }
  .chip { transition: all .15s ease; }
`;

// Kept for backwards compatibility with any older imports.
export const NEU_CSS = GLASS_CSS;
