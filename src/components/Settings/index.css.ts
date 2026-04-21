import { style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

// Layout
export const win = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100vh",
  background: vars.bg.settings,
  overflow: "hidden",
  fontFamily: '"Geist Mono", monospace',
  WebkitFontSmoothing: "antialiased",
  color: vars.text.high,
  userSelect: "none",
});

// Invisible spacer that sits under the traffic lights and acts as drag region
export const titlebarSpacer = style({
  height: 28,
  flexShrink: 0,
  // @ts-expect-error — Tauri / WebKit drag region property not in standard typedefs
  WebkitAppRegion: "drag",
});

export const body = style({
  display: "flex",
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
});

export const sidebar = style({
  width: 160,
  background: vars.bg.crust,
  padding: "12px 8px",
  borderRight: `0.5px solid ${vars.border.subtle}`,
  flexShrink: 0,
});

export const content = style({
  flex: 1,
  padding: 24,
  overflowY: "auto",
  minWidth: 0,
});

// Nav items
export const navItem = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: 7,
  fontSize: 13,
  color: vars.text.dim,
  cursor: "pointer",
  marginBottom: 2,
  background: "transparent",
  border: "none",
  width: "100%",
  textAlign: "left",
  transition: "background 0.1s",
  selectors: {
    "&:hover": {
      background: vars.border.subtle,
      color: vars.text.low,
    },
  },
});

export const navItemActive = style({
  background: vars.border.normal,
  color: vars.text.high,
  selectors: {
    "&:hover": {
      background: vars.border.normal,
      color: vars.text.high,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.accent.blueAlt}`,
      outlineOffset: -2,
    },
  },
});

export const navIcon = style({
  width: 16,
  height: 16,
  opacity: 0.6,
  flexShrink: 0,
});

// Section titles & labels
export const sectionTitle = style({
  fontSize: 18,
  fontWeight: 500,
  color: vars.text.high,
  marginBottom: 20,
});

export const rowLabel = style({
  fontSize: 13,
  color: vars.text.dim,
  marginBottom: 8,
});

export const rowDesc = style({
  fontSize: 11,
  color: vars.text.dimmest,
  marginTop: 4,
});

export const row = style({
  marginBottom: 20,
});

// Segmented control
export const segControl = style({
  display: "flex",
  background: vars.border.subtle,
  borderRadius: 8,
  padding: 3,
  gap: 2,
});

export const segButton = style({
  flex: 1,
  padding: "5px 0",
  borderRadius: 6,
  fontSize: 12,
  color: vars.text.faint,
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.15s",
  border: "none",
  background: "transparent",
  selectors: {
    "&:hover": {
      color: vars.text.low,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.accent.blueAlt}`,
      outlineOffset: -2,
    },
  },
});

export const segButtonActive = style({
  background: vars.border.medium,
  color: vars.text.high,
});

// Toggle row
export const toggleRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 14px",
  background: vars.border.subtle,
  borderRadius: 8,
  border: `0.5px solid ${vars.border.subtle}`,
  marginBottom: 16,
});

export const toggleLabel = style({
  fontSize: 13,
  color: vars.text.mid,
});

export const toggleSub = style({
  fontSize: 11,
  color: vars.text.dimmer,
  marginTop: 2,
});

export const toggleBase = style({
  width: 36,
  height: 20,
  borderRadius: 10,
  position: "relative",
  cursor: "pointer",
  flexShrink: 0,
  border: "none",
  padding: 0,
  transition: "background 0.15s",
  selectors: {
    "&::after": {
      content: "''",
      position: "absolute",
      width: 16,
      height: 16,
      borderRadius: "50%",
      background: "#fff", // hardcoded: thumb needs max contrast on both track states in both themes
      top: 2,
      transition: "right 0.15s, left 0.15s",
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.accent.blueAlt}`,
      outlineOffset: 2,
    },
  },
});

export const toggleOn = style({
  background: vars.accent.blueAlt,
  selectors: {
    "&::after": {
      right: 2,
      left: "auto",
    },
  },
});

export const toggleOff = style({
  background: vars.border.medium,
  selectors: {
    "&::after": {
      left: 2,
      right: "auto",
    },
  },
});

// Divider
export const divider = style({
  height: "0.5px",
  background: vars.border.subtle,
  margin: "20px 0",
});

// Keyboard shortcut rows
export const kbdSection = style({
  marginBottom: 10,
});

export const kbdRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 14px",
  background: vars.border.subtle,
  borderRadius: 8,
  border: `0.5px solid ${vars.border.subtle}`,
  marginBottom: 6,
});

export const kbdAction = style({
  fontSize: 13,
  color: vars.text.mid,
});

export const kbdKeys = style({
  display: "flex",
  gap: 3,
  alignItems: "center",
});

export const kbd = style({
  fontFamily: "monospace",
  fontSize: 11,
  padding: "2px 6px",
  borderRadius: 4,
  border: `0.5px solid ${vars.border.medium}`,
  background: vars.border.normal,
  color: vars.text.low,
});

// App list
export const appList = style({
  background: vars.border.subtle,
  borderRadius: 8,
  border: `0.5px solid ${vars.border.subtle}`,
  overflow: "hidden",
});

export const appItem = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "9px 14px",
  borderBottom: `0.5px solid ${vars.border.subtle}`,
  fontSize: 13,
  color: vars.text.low,
  selectors: {
    "&:last-child": {
      borderBottom: "none",
    },
  },
});

export const appRemove = style({
  width: 16,
  height: 16,
  borderRadius: "50%",
  background: vars.border.normal,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: vars.text.faint,
  fontSize: 11,
  lineHeight: 1,
  border: "none",
  flexShrink: 0,
  selectors: {
    "&:hover": {
      background: vars.border.medium,
      color: vars.text.low,
    },
  },
});

export const addBtn = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  fontSize: 13,
  color: vars.accent.blueAlt,
  cursor: "pointer",
  marginTop: 8,
  background: "transparent",
  border: "none",
  selectors: {
    "&:hover": {
      color: vars.accent.blueAlt,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.accent.blueAlt}`,
      outlineOffset: 2,
      borderRadius: 6,
    },
  },
});

// About card
export const aboutCard = style({
  background: vars.border.subtle,
  borderRadius: 10,
  border: `0.5px solid ${vars.border.subtle}`,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
});

export const aboutIcon = style({
  width: 52,
  height: 52,
  borderRadius: 12,
  background: vars.bg.crust,
  border: `0.5px solid ${vars.border.normal}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const aboutName = style({
  fontSize: 16,
  fontWeight: 500,
  color: vars.text.high,
});

export const aboutVer = style({
  fontSize: 12,
  color: vars.text.dimmer,
});

export const aboutBuilt = style({
  fontSize: 12,
  color: vars.text.dimmest,
  marginTop: 4,
});

export const deactivateConfirmRow = style({
  display: "flex",
  gap: 8,
  marginTop: 8,
});

export const rowError = style({
  fontSize: 13,
  color: vars.accent.red,
  marginBottom: 4,
  fontFamily: "inherit",
});

export const link = style({
  color: vars.accent.blueAlt,
  textDecoration: "none",
  fontSize: 12,
  borderRadius: 4,
  selectors: {
    "&:hover": {
      textDecoration: "underline",
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.accent.blueAlt}`,
      outlineOffset: 2,
    },
  },
});
