import { style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

export const container = style({
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const pickerTitle = style({
  fontSize: 11,
  fontWeight: 600,
  color: vars.text.sub0,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
});

export const folderOption = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 6,
  background: vars.bg.surface0,
  cursor: "pointer",
  fontSize: 12,
  color: vars.text.primary,
  userSelect: "none",
  selectors: {
    "&:hover": { background: vars.bg.surface1 },
  },
});

export const folderOptionActive = style({
  outline: `2px solid ${vars.accent.blue}`,
  outlineOffset: -2,
});

export const folderOptionFocused = style({
  background: vars.bg.surface1,
});

export const folderOptionKey = style({
  fontSize: 11,
  fontWeight: 700,
  fontFamily: "monospace",
  color: vars.accent.blue,
  background: vars.bg.base,
  borderRadius: 4,
  padding: "1px 5px",
  flexShrink: 0,
});

export const folderOptionLabel = style({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const folderOptionCount = style({
  fontSize: 10,
  color: vars.text.sub0,
  flexShrink: 0,
});

export const newFolderOption = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  color: vars.accent.green,
  userSelect: "none",
  selectors: {
    "&:hover": { background: vars.bg.surface0 },
  },
});

export const newFolderOptionFocused = style({
  background: vars.bg.surface1,
});

export const hint = style({
  fontSize: 10,
  color: vars.text.sub0,
  fontStyle: "italic",
  paddingTop: 4,
});
