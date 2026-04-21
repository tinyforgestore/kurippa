import { style } from "@vanilla-extract/css";
import { PANEL_WIDTH } from "@/hooks/usePreviewPanel";
import { vars } from "@/theme.css";

export const panel = style({
  width: PANEL_WIDTH,
  flexShrink: 0,
  background: vars.bg.mantle,
  borderLeft: `1px solid ${vars.bg.surface0}`,
  borderRadius: "0 12px 12px 0",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

export const emptyState = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.text.sub0,
  fontSize: 12,
  textAlign: "center",
  userSelect: "none",
});

/** Zone 1 — content canvas for text and RTF */
export const contentCanvas = style({
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  padding: 12,
  position: "relative",
  display: "flex",
  flexDirection: "column",
});

/** Zone 1 — content canvas for images (centered) */
export const imageCanvas = style({
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  padding: 12,
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

/** Gradient overlay that fades text off at the bottom edge */
export const textFade = style({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 48,
  background: `linear-gradient(to bottom, transparent, ${vars.bg.mantle})`,
  pointerEvents: "none",
});

export const textContent = style({
  fontFamily: "monospace",
  fontSize: 11,
  color: vars.text.primary,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  overflowWrap: "break-word",
  margin: 0,
});

export const imageContent = style({
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  display: "block",
  borderRadius: 6,
});

export const rtfContent = style({
  fontSize: 12,
  color: vars.text.primary,
  overflow: "hidden",
});

/** Zone 2 — metadata row */
export const metaRow = style({
  display: "flex",
  flexDirection: "column",
  gap: 3,
  padding: "8px 12px",
  borderTop: `1px solid ${vars.bg.surface0}`,
  flexShrink: 0,
});

export const metaTime = style({
  fontSize: 11,
  color: vars.text.sub1,
  cursor: "default",
  userSelect: "none",
});

export const metaDetail = style({
  fontSize: 11,
  color: vars.text.sub0,
  userSelect: "none",
});

/** Zone 3 — keyboard shortcut hint row */
export const actionRow = style({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  padding: "6px 12px",
  borderTop: `1px solid ${vars.bg.surface0}`,
  flexShrink: 0,
});

export const actionHint = style({
  fontSize: 10,
  color: vars.text.overlay0,
  userSelect: "none",
  fontFamily: "monospace",
});

export const kbdChip = style({
  display: "inline-block",
  fontSize: 9,
  fontFamily: "monospace",
  color: vars.text.sub1,
  background: vars.bg.surface0,
  border: `1px solid ${vars.bg.surface1}`,
  borderRadius: 3,
  padding: "0 3px",
  lineHeight: "14px",
  userSelect: "none",
  verticalAlign: "middle",
});

export const colorContent = style({
  width: "70%",
  margin: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const colorSwatchLarge = style({
  width: "100%",
  aspectRatio: "1",
  borderRadius: 8,
  border: `1px solid ${vars.border.normal}`,
  flexShrink: 0,
});

export const colorMetaTable = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const colorMetaRow = style({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 11,
  color: vars.text.sub1,
  userSelect: "text",
});

export const colorMetaLabel = style({
  color: vars.text.sub0,
  userSelect: "none",
  marginRight: 8,
  flexShrink: 0,
});
