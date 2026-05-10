import { RefObject } from "react";
import iconDark from "@/assets/icon.png";
import iconLight from "@/assets/icon-light.png";
import type { Theme } from "@/hooks/useTheme";
import type { LicenseMode } from "@/hooks/useLicense";
import { topbar, topbarIcon, search, licenseChip, crownIcon } from "@/components/Topbar/index.css";

interface TopbarProps {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  onQueryChange: (q: string) => void;
  onDismiss: () => void;
  onDragStart?: () => void;
  overlayActive?: boolean;
  theme?: Theme;
  licenseMode?: LicenseMode;
  onOpenActivation?: () => void;
}

export function Topbar({ inputRef, query, onQueryChange, onDismiss, onDragStart, overlayActive, theme, licenseMode, onOpenActivation }: TopbarProps) {
  const icon = theme === "light" ? iconLight : iconDark;
  return (
    <div className={topbar}>
      <img className={topbarIcon} src={icon} data-tauri-drag-region onMouseDown={onDragStart} />
      {licenseMode === "activated" && (
        <svg data-testid="crown-icon" className={crownIcon} width={16} height={16} viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
          <path d="M5 16h14" />
        </svg>
      )}
      {licenseMode === "trial" && (
        <button className={licenseChip} onClick={onOpenActivation}>
          Free<br/>Trial
        </button>
      )}
      <input
        ref={inputRef}
        autoFocus
        className={search}
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            if (!overlayActive) {
              e.stopPropagation();
              onDismiss();
            }
          }
        }}
      />
    </div>
  );
}
