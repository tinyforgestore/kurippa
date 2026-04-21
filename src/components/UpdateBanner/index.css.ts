import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

const slideDown = keyframes({
  from: { maxHeight: 0, opacity: 0 },
  to: { maxHeight: 40, opacity: 1 },
});

export const updateBanner = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 14px",
  background: vars.update.bg,
  borderBottom: `0.5px solid ${vars.update.border}`,
  fontSize: 12,
  color: vars.text.mid,
  flexShrink: 0,
  overflow: "hidden",
  animation: `${slideDown} 200ms ease-out`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const updateMessage = style({
  flex: 1,
});

export const updateActions = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
});

export const updateInstall = style({
  background: "none",
  border: "none",
  color: vars.accent.blueAlt,
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
  selectors: {
    "&:hover": { textDecoration: "underline" },
  },
});

export const updateDismiss = style({
  background: "none",
  border: "none",
  color: vars.text.dimmer,
  fontSize: 13,
  cursor: "pointer",
  padding: 0,
  lineHeight: 1,
  selectors: {
    "&:hover": { color: vars.text.low },
  },
});
