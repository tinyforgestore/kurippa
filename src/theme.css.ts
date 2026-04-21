import { createTheme, createThemeContract } from "@vanilla-extract/css";

export const vars = createThemeContract({
  bg: {
    base: null,
    mantle: null,
    surface0: null,
    surface1: null,
    crust: null,
    settings: null,
  },
  text: {
    primary: null,
    sub0: null,
    sub1: null,
    overlay0: null,
    high: null,
    mid: null,
    low: null,
    dim: null,
    faint: null,
    dimmer: null,
    dimmest: null,
  },
  accent: {
    blue: null,
    blueAlt: null,
    red: null,
    redHover: null,
    green: null,
    mauve: null,
  },
  border: {
    subtle: null,
    normal: null,
    medium: null,
  },
  update: {
    bg: null,
    border: null,
  },
});

export const darkTheme = createTheme(vars, {
  bg: {
    base: "#1e1e2e",
    mantle: "#181825",
    surface0: "#313244",
    surface1: "#45475a",
    crust: "#141525",
    settings: "#1a1b2e",
  },
  text: {
    primary: "#cdd6f4",
    sub0: "#6c7086",
    sub1: "#a6adc8",
    overlay0: "#585b70",
    high: "rgba(255,255,255,0.9)",
    mid: "rgba(255,255,255,0.8)",
    low: "rgba(255,255,255,0.7)",
    dim: "rgba(255,255,255,0.5)",
    faint: "rgba(255,255,255,0.4)",
    dimmer: "rgba(255,255,255,0.35)",
    dimmest: "rgba(255,255,255,0.3)",
  },
  accent: {
    blue: "#89b4fa",
    blueAlt: "#378ADD",
    red: "#f38ba8",
    redHover: "#eba0ac",
    green: "#a6e3a1",
    mauve: "#cba6f7",
  },
  border: {
    subtle: "rgba(255,255,255,0.06)",
    normal: "rgba(255,255,255,0.1)",
    medium: "rgba(255,255,255,0.15)",
  },
  update: {
    bg: "rgba(55,138,221,0.12)",
    border: "rgba(55,138,221,0.3)",
  },
});

export const lightTheme = createTheme(vars, {
  bg: {
    base: "#eff1f5",
    mantle: "#e6e9ef",
    surface0: "#ccd0da",
    surface1: "#bcc0cc",
    crust: "#dce0e8",
    settings: "#e6e9ef",
  },
  text: {
    primary: "#2e3047",
    sub0: "#525470",
    sub1: "#474a65",
    overlay0: "#8c8fa1",
    high: "rgba(0,0,0,0.9)",
    mid: "rgba(0,0,0,0.8)",
    low: "rgba(0,0,0,0.7)",
    dim: "rgba(0,0,0,0.5)",
    faint: "rgba(0,0,0,0.4)",
    dimmer: "rgba(0,0,0,0.35)",
    dimmest: "rgba(0,0,0,0.3)",
  },
  accent: {
    blue: "#1e66f5",
    blueAlt: "#1e66f5",
    red: "#d20f39",
    redHover: "#e64553",
    green: "#40a02b",
    mauve: "#8839ef",
  },
  border: {
    subtle: "rgba(0,0,0,0.06)",
    normal: "rgba(0,0,0,0.1)",
    medium: "rgba(0,0,0,0.15)",
  },
  update: {
    bg: "rgba(30,102,245,0.12)",
    border: "rgba(30,102,245,0.3)",
  },
});
