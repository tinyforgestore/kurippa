import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

const slideDown = keyframes({
  from: { maxHeight: 0, opacity: 0 },
  to: { maxHeight: 40, opacity: 1 },
});

export const upgradeBanner = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 14px",
  background: vars.update.bg,
  borderTop: `0.5px solid ${vars.update.border}`,
  borderBottom: `0.5px solid ${vars.update.border}`,
  borderRadius: 6,
  fontSize: 12,
  color: vars.text.mid,
  flexShrink: 0,
  overflow: "hidden",
  animation: `${slideDown} 200ms ease-out`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const bannerMessage = style({
  flex: 1,
});

export const upgradeLink = style({
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
