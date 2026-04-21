import { style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  overflowY: "auto",
  overflowX: "hidden",
  flex: 1,
  minHeight: 0,
  padding: "0 6px",
});

export const listRow = style({
  padding: "10px 12px",
  borderRadius: 6,
  background: vars.bg.surface0,
  cursor: "pointer",
  fontSize: 12,
  color: vars.text.primary,
  minHeight: 35,
  width: "100%",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  transition: "background 0.15s",
});

export const itemSelected = style({
  background: vars.bg.surface1,
  outline: `2px solid ${vars.accent.blue}`,
  outlineOffset: -2,
});

export const pinnedHeader = style([listRow, {
  userSelect: "none",
}]);

export const pinnedHeaderLabel = style({
  fontWeight: 600,
  color: vars.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
});

export const shortcutHint = style({
  fontSize: 10,
  color: vars.text.sub1,
  fontStyle: "italic",
  userSelect: "none",
});

export const pinnedHeaderIcon = style({
  color: vars.accent.red,
  flexShrink: 0,
});

export const folderHeader = style([listRow, {
  userSelect: "none",
}]);

export const folderHeaderIcon = style({
  color: vars.accent.blue,
  flexShrink: 0,
});

export const folderHeaderLabel = style({
  fontWeight: 600,
  color: vars.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
});

export const folderItemAccent = style({});
