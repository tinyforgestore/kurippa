import { style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

export const container = style({
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

export const title = style({
  fontSize: 12,
  fontWeight: 600,
  color: vars.text.primary,
  marginBottom: 4,
});

export const option = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 6,
  background: "transparent",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
  color: vars.text.primary,
  userSelect: "none",
  selectors: {
    "&:hover": { background: vars.bg.surface0 },
  },
});

export const optionKey = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  height: 16,
  borderRadius: 4,
  background: vars.bg.surface1,
  color: vars.text.sub1,
  fontSize: 10,
  fontWeight: 600,
});

export const buttonHighlighted = style({
  background: vars.bg.surface1,
  outline: `2px solid ${vars.accent.blue}`,
  outlineOffset: -2,
});

export const hint = style({
  fontSize: 10,
  color: vars.text.sub0,
  fontStyle: "italic",
  paddingTop: 4,
});
