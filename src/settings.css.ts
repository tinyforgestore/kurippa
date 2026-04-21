import { globalFontFace, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

globalFontFace("Geist Mono", {
  src: 'url("/src/assets/GeistMono-VariableFont_wght.ttf") format("truetype")',
  fontWeight: "100 900",
  fontStyle: "normal",
});

globalStyle("*::-webkit-scrollbar", { display: "none" });
globalStyle("*", { scrollbarWidth: "none" });

globalStyle("*", { margin: 0, padding: 0, boxSizing: "border-box", userSelect: "none" });
globalStyle("button, input, select, textarea", { fontFamily: "inherit" });

globalStyle(":root", {
  fontFamily: '"Geist Mono", monospace',
  fontSize: 14,
  color: vars.text.high,
  WebkitFontSmoothing: "antialiased",
});

globalStyle("html, body", {
  height: "100%",
  background: vars.bg.settings,
  overflow: "hidden",
});

globalStyle("#root", {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  overflow: "hidden",
});
