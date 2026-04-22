import { style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

export const backdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const card = style({
  width: 360,
  borderRadius: 12,
  background: vars.bg.base,
  border: `1px solid ${vars.border.normal}`,
  padding: "28px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

export const title = style({
  fontSize: 15,
  fontWeight: 600,
  color: vars.text.primary,
});

export const body = style({
  fontSize: 13,
  lineHeight: 1.6,
  color: vars.text.sub1,
  whiteSpace: "pre-line",
});

export const primaryButton = style({
  background: vars.accent.blue,
  color: vars.bg.base,
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  border: "none",
  selectors: {
    "&:hover": {
      filter: "brightness(0.88)",
    },
  },
});

export const secondaryButton = style({
  background: "transparent",
  color: vars.text.sub1,
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  border: `1px solid ${vars.border.normal}`,
  selectors: {
    "&:hover": {
      background: vars.bg.surface0,
    },
  },
});

export const errorText = style({
  fontSize: 12,
  color: vars.accent.red,
});
