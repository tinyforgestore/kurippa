import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

export const spinAnimation = keyframes({ to: { transform: "rotate(360deg)" } });

export const container = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  padding: "28px 40px 32px",
  background: vars.bg.base,
  gap: 0,
});

export const header = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  marginBottom: 22,
});

export const appIcon = style({
  width: 48,
  height: 48,
  borderRadius: 12,
  marginBottom: 4,
});

export const appName = style({
  fontSize: 18,
  fontWeight: 600,
  color: vars.text.high,
});

export const appSubtitle = style({
  fontSize: 11,
  color: vars.text.dimmer,
});

export const form = style({
  width: "100%",
  maxWidth: 400,
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

export const label = style({
  fontSize: 12,
  color: vars.text.dim,
  marginBottom: 4,
});

export const input = style({
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${vars.border.normal}`,
  background: vars.bg.surface0,
  color: vars.text.primary,
  fontSize: 13,
  letterSpacing: 0.3,
  outline: "none",
  selectors: {
    "&:focus": { borderColor: vars.accent.blueAlt },
    "&::placeholder": { color: vars.text.sub0 },
  },
});

export const inputError = style({
  border: `1px solid ${vars.accent.red}`,
  selectors: {
    "&:focus": { borderColor: vars.accent.red },
  },
});

export const errorMsg = style({
  fontSize: 11,
  color: vars.accent.red,
  minHeight: 16,
});

export const activateBtn = style({
  width: "100%",
  padding: "10px 0",
  borderRadius: 8,
  border: "none",
  background: vars.accent.blueAlt,
  color: "#fff",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  transition: "opacity 0.15s",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  selectors: {
    "&:disabled": {
      opacity: 0.4,
      cursor: "not-allowed",
    },
    "&:hover:not(:disabled)": {
      opacity: 0.85,
    },
  },
});

export const divider = style({
  width: "100%",
  maxWidth: 400,
  height: "0.5px",
  background: vars.border.subtle,
  margin: "20px 0",
});

export const buyRow = style({
  width: "100%",
  maxWidth: 400,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
});

export const buyBtnPrimary = style({
  padding: "10px 0",
  borderRadius: 8,
  border: `1px solid ${vars.accent.blueAlt}`,
  background: `color-mix(in srgb, ${vars.accent.blueAlt} 13%, transparent)`,
  color: vars.accent.blue,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  selectors: {
    "&:hover": { opacity: 0.85 },
  },
});

export const buyBtnOutline = style({
  padding: "10px 0",
  borderRadius: 8,
  border: `1px solid ${vars.border.medium}`,
  background: "transparent",
  color: vars.text.mid,
  fontSize: 13,
  cursor: "pointer",
  selectors: {
    "&:hover": { opacity: 0.85 },
  },
});

export const buyCaption = style({
  fontSize: 10,
  color: vars.text.dimmer,
  marginTop: 10,
  textAlign: "center",
});

export const checkPopAnimation = keyframes({
  "0%": { transform: "scale(0.4)", opacity: "0" },
  "60%": { transform: "scale(1.15)", opacity: "1" },
  "100%": { transform: "scale(1)", opacity: "1" },
});

export const checkStrokeAnimation = keyframes({
  from: { strokeDashoffset: "24" },
  to: { strokeDashoffset: "0" },
});

export const ringPulseAnimation = keyframes({
  "0%": { transform: "scale(0.6)", opacity: "0.6" },
  "100%": { transform: "scale(1.8)", opacity: "0" },
});

export const autoCloseAnimation = keyframes({
  from: { transform: "scaleX(1)" },
  to: { transform: "scaleX(0)" },
});

export const celebrationWrap = style({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "28px 40px 28px",
  background: vars.bg.base,
  boxSizing: "border-box",
  position: "relative",
  overflow: "hidden",
});

export const receiptBlock = style({
  width: "100%",
  maxWidth: 340,
  border: `0.5px solid ${vars.border.subtle}`,
  borderRadius: 8,
  background: vars.bg.surface0,
  padding: "10px 14px",
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  rowGap: 6,
  columnGap: 14,
  fontSize: 11,
});

export const shortcutTeaser = style({
  marginTop: 20,
  fontSize: 11,
  color: vars.text.dimmer,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
});

export const shortcutKey = style({
  fontSize: 10,
  padding: "2px 6px",
  borderRadius: 4,
  border: `0.5px solid ${vars.border.medium}`,
  background: vars.border.normal,
  color: vars.text.high,
});

export const celebrationCtaBtn = style({
  marginTop: 22,
  padding: "10px 22px",
  borderRadius: 8,
  border: "none",
  background: vars.accent.blueAlt,
  color: "#fff",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  selectors: {
    "&:hover": { opacity: 0.85 },
  },
});

export const autoCloseBar = style({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 2,
  transformOrigin: "right",
});
