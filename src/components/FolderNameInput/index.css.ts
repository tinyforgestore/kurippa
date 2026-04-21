import { style } from "@vanilla-extract/css";
import { vars } from "@/theme.css";

export const container = style({
  padding: "6px 12px",
});

export const input = style({
  width: "100%",
  background: vars.bg.surface0,
  border: `1px solid ${vars.accent.blue}`,
  borderRadius: 6,
  color: vars.text.primary,
  fontSize: 12,
  padding: "6px 10px",
  outline: "none",
  boxSizing: "border-box",
  selectors: {
    "&::placeholder": {
      color: vars.text.sub0,
    },
  },
});
