import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";
import { listRow } from "@/components/HistoryList/index.css";
import { DELETE_DURATION_MS, LAND_DURATION_MS, LIFT_DURATION_MS } from "@/constants/animation";

export const item = style([
  listRow,
  {
    position: "relative",
    transition: `transform ${LIFT_DURATION_MS}ms ease-out`,
    willChange: "transform",
  },
]);

export const itemText = style({
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: vars.text.primary,
  flex: 1,
  minWidth: 0,
});

export const colorSwatch = style({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
  marginRight: 6,
  border: `1px solid ${vars.border.medium}`,
  verticalAlign: "middle",
  position: "relative",
  top: -1,
});

globalStyle(`${itemText} b`, {
  color: vars.accent.mauve,
  fontWeight: 700,
});

globalStyle(`${itemText} svg`, {
  verticalAlign: "middle",
});

export const itemScaled = style({
  transform: "scale(1.02)",
  "@media": {
    "(prefers-reduced-motion: reduce)": { transform: "none" },
  },
});

const liftKeyframe = keyframes({
  "0%": { transform: "scale(1.04) translateY(0)" },
  "100%": { transform: "scale(1.04) translateY(-4px)" },
});

const landKeyframe = keyframes({
  "0%": { transform: "translateY(-8px)", opacity: 0.7 },
  "100%": { transform: "translateY(0)", opacity: 1 },
});

export const itemLifting = style({
  animation: `${liftKeyframe} ${LIFT_DURATION_MS}ms ease-out forwards`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const itemLanding = style({
  animation: `${landKeyframe} ${LAND_DURATION_MS}ms ease-in-out forwards`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

const deleteKeyframe = keyframes({
  "0%": {
    opacity: 1,
    transform: "translateX(0)",
    maxHeight: "60px",
    paddingTop: "10px",
    paddingBottom: "10px",
  },
  "100%": {
    opacity: 0,
    transform: "translateX(-12px)",
    maxHeight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  },
});

export const itemDeleting = style({
  animation: `${deleteKeyframe} ${DELETE_DURATION_MS}ms ease-in forwards`,
  overflow: "hidden",
  minHeight: 0,
  pointerEvents: "none",
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none", opacity: 0 },
  },
});

export const itemDimmed = style({
  opacity: 0.4,
  pointerEvents: "none",
});

export const badgeOverlay = style({
  position: "absolute",
  top: "50%",
  right: 8,
  transform: "translateY(-50%)",
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: vars.accent.mauve,
  color: vars.bg.base,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: "18px",
  textAlign: "center",
  fontFamily: "monospace",
  userSelect: "none",
  pointerEvents: "none",
});

export const pinIcon = style({
  color: vars.accent.red,
  flexShrink: 0,
  opacity: 0.7,
});

export const qrBadge = style({
  fontSize: 9,
  fontWeight: 700,
  fontFamily: "monospace",
  color: vars.accent.green,
  border: `1px solid ${vars.accent.green}`,
  borderRadius: 3,
  padding: "0 3px",
  lineHeight: "14px",
  letterSpacing: "0.04em",
  flexShrink: 0,
  userSelect: "none",
  pointerEvents: "none",
});

const flashKeyframe = keyframes({
  "0%": { background: vars.bg.surface0 },
  "30%": { background: vars.accent.red },
  "100%": { background: vars.bg.surface0 },
});

export const flashPulse = style({
  animation: `${flashKeyframe} 150ms ease-out forwards`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});
