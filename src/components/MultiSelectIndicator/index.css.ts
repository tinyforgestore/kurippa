import { style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

export const indicator = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px",
  borderRadius: 6,
  background: vars.bg.surface0,
  border: `1px solid ${vars.accent.blue}`,
  fontSize: 11,
  color: vars.text.primary,
  userSelect: "none",
  flexShrink: 0,
  flexWrap: "wrap",
});

export const label = style({
  color: vars.accent.blue,
  fontWeight: 600,
});

export const badges = style({
  color: vars.accent.mauve,
  letterSpacing: 1,
});

export const hint = style({
  color: vars.text.sub0,
  marginLeft: "auto",
});

export const toast = style({
  marginLeft: "auto",
  color: vars.accent.red,
  fontWeight: 600,
});
