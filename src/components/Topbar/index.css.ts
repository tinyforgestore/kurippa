import { style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

export const topbar = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
});

export const topbarIcon = style({
  width: 32,
  height: 32,
  flexShrink: 0,
  opacity: 0.85,
  cursor: "grab",
});

export const search = style({
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: `1px solid ${vars.bg.surface1}`,
  background: vars.bg.surface0,
  color: vars.text.primary,
  fontSize: 13,
  outline: "none",
  selectors: {
    "&::placeholder": { color: vars.text.sub0 },
    "&:focus": { borderColor: vars.accent.blue },
  },
});

export const licenseChip = style({
  flexShrink: 0,
  fontSize: 10,
  color: vars.text.dimmer,
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  whiteSpace: "nowrap",
  lineHeight: 1.1,
  textAlign: "left",
  selectors: {
    "&:hover": { color: vars.text.low },
  },
});

export const crownIcon = style({
  flexShrink: 0,
  color: vars.accent.mauve,
});
