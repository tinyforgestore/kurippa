import { style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

export const footer = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "stretch",
  flexShrink: 0,
  borderTop: `1px solid ${vars.bg.surface0}`,
  background: vars.bg.mantle,
  borderRadius: "0 0 12px 12px",
});

export const footerButton = style({
  flex: 1,
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  padding: "7px 8px",
  background: "transparent",
  border: "none",
  color: vars.text.sub0,
  fontSize: 11,
  cursor: "pointer",
  outline: "none",
  selectors: {
    "&:hover": { color: vars.text.primary, background: vars.bg.base },
    "&:focus-visible": { color: vars.text.primary, background: vars.bg.base, outline: `2px solid ${vars.accent.blue}`, outlineOffset: -2 },
  },
});

export const footerHint = style({
  fontSize: 10,
  color: vars.bg.surface1,
  fontStyle: "italic",
  selectors: {
    [`${footerButton}:hover &`]: { color: vars.text.sub0 },
    [`${footerButton}:focus-visible &`]: { color: vars.text.sub0 },
  },
});

export const footerDivider = style({
  width: 1,
  background: vars.border.medium,
  flexShrink: 0,
  alignSelf: "stretch",
});

export const confirmRow = style({
  flex: 1,
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "5px 10px",
});

export const confirmLabel = style({
  fontSize: 11,
  color: vars.text.primary,
  flexShrink: 0,
});

export const confirmYesButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "3px 10px",
  background: vars.accent.red,
  border: "none",
  borderRadius: 4,
  color: vars.bg.base,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  outline: "none",
  selectors: {
    "&:hover": { background: vars.accent.redHover },
    "&:focus-visible": { outline: `2px solid ${vars.accent.red}`, outlineOffset: 2 },
  },
});

export const confirmCancelButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "3px 10px",
  background: "transparent",
  border: `1px solid ${vars.bg.surface1}`,
  borderRadius: 4,
  color: vars.text.sub0,
  fontSize: 11,
  cursor: "pointer",
  outline: "none",
  selectors: {
    "&:hover": { color: vars.text.primary, borderColor: vars.text.sub0 },
    "&:focus-visible": { color: vars.text.primary, borderColor: vars.text.sub0, outline: `2px solid ${vars.accent.blue}`, outlineOffset: 2 },
  },
});
