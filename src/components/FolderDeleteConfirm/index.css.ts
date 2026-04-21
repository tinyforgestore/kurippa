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

export const confirmButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 10px",
  borderRadius: 6,
  background: vars.accent.red,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  color: vars.bg.base,
  userSelect: "none",
  selectors: {
    "&:hover": { background: vars.accent.redHover },
  },
});

export const hint = style({
  fontSize: 10,
  color: vars.text.sub0,
  fontStyle: "italic",
  paddingTop: 4,
});
