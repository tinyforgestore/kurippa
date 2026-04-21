import { style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

export const menu = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
});

export const menuHeader = style({
  fontSize: 11,
  color: vars.text.sub0,
  userSelect: "none",
  padding: "4px 2px 8px",
  flexShrink: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const menuOption = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 6,
  background: vars.bg.surface0,
  cursor: "pointer",
  fontSize: 12,
  color: vars.text.primary,
  userSelect: "none",
  transition: "background 0.1s",
  selectors: {
    "&:hover": { background: vars.bg.surface1 },
  },
});

export const menuOptionSelected = style({
  background: vars.bg.surface1,
  outline: `2px solid ${vars.accent.blue}`,
  outlineOffset: -2,
});

export const menuNumber = style({
  fontSize: 10,
  color: vars.text.sub0,
  fontFamily: "monospace",
  background: vars.bg.base,
  borderRadius: 3,
  padding: "1px 5px",
  flexShrink: 0,
  userSelect: "none",
});
