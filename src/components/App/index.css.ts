import { globalFontFace, globalStyle, style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

globalFontFace("Geist Mono", {
  src: 'url("/src/assets/GeistMono-VariableFont_wght.ttf") format("truetype")',
  fontWeight: "100 900",
  fontStyle: "normal",
});

globalStyle("*::-webkit-scrollbar", { display: "none" });
globalStyle("*", { scrollbarWidth: "none" });

globalStyle("*", { margin: 0, padding: 0, boxSizing: "border-box" });
globalStyle("button, input, select, textarea", { fontFamily: "inherit" });

globalStyle(":root", {
  fontFamily: '"Geist Mono", monospace',
  fontSize: 14,
  color: vars.text.primary,
  WebkitFontSmoothing: "antialiased",
});

globalStyle("html, body", {
  height: "100%",
  background: "transparent !important",
  borderRadius: 12,
  overflow: "hidden",
});

globalStyle("#root", {
  display: "flex",
  flexDirection: "column",
  background: vars.bg.base,
  borderRadius: 12,
  height: "100vh",
  overflow: "hidden",
});

export const container = style({
  display: "flex",
  flexDirection: "row",
  flex: 1,
  minHeight: 0,
  height: "100%",
});

export const mainColumn = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  padding: 12,
  gap: 10,
  minHeight: 0,
  minWidth: 0,
});

export const reactivateBtn = style({
  background: "none",
  border: "none",
  color: "inherit",
  cursor: "pointer",
  textDecoration: "underline",
  padding: 0,
  fontSize: "inherit",
});

export const inlineToast = style({
  fontSize: 11,
  fontWeight: 600,
  color: vars.accent.red,
  textAlign: "center",
  padding: "6px 10px",
  background: vars.bg.surface0,
  borderRadius: 6,
  userSelect: "none",
  flexShrink: 0,
});

export const inlineToastGreen = style({
  fontSize: 11,
  fontWeight: 600,
  color: vars.accent.green,
  textAlign: "center",
  padding: "6px 10px",
  background: vars.bg.surface0,
  borderRadius: 6,
  userSelect: "none",
  flexShrink: 0,
});
