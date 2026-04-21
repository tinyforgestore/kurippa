import { useCallback, useEffect, useRef, useState } from "react";
import { PasteOption } from "@/utils/pasteAs";

const CHAR_SHORTCUT_KEYS = ['"', "'", "`", "(", "[", "{"];

interface ActiveSubmenu {
  options: PasteOption[];
  label: string;
}

export function usePasteAsMenu(
  topOptions: PasteOption[],
  onClose: () => void,
  onSelect: (option: PasteOption) => void,
  onCursorChange: (text: string | null) => void,
  onOpenPreview: () => void,
) {
  const [cursor, setCursor] = useState(0);
  const [submenu, setSubmenu] = useState<ActiveSubmenu | null>(null);
  const [subCursor, setSubCursor] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeOptions = submenu ? submenu.options : topOptions;
  const activeCursor = submenu ? subCursor : cursor;

  const enterSubmenu = useCallback((opt: PasteOption) => {
    if (!opt.submenu) return;
    setSubmenu({ options: opt.submenu, label: opt.label });
    setSubCursor(0);
  }, []);

  const exitSubmenu = useCallback(() => setSubmenu(null), []);

  // Notify parent of preview text for the focused option
  useEffect(() => {
    const current = activeOptions[activeCursor];
    onCursorChange(current?.action?.kind === "paste-text" ? current.action.text : null);
    return () => { onCursorChange(null); };
  }, [activeCursor, activeOptions, onCursorChange]);

  // Scroll focused option into view
  useEffect(() => {
    if (!menuRef.current) return;
    const items = menuRef.current.querySelectorAll<HTMLElement>("[data-paste-option]");
    items[activeCursor]?.scrollIntoView({ block: "nearest" });
  }, [activeCursor]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc / ← : exit submenu or close menu
      if (e.key === "Escape" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (submenu) {
          exitSubmenu();
        } else {
          onClose();
        }
        return;
      }

      // → : enter submenu on submenu items, or open preview on others
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (!submenu) {
          const focused = topOptions[cursor];
          if (focused?.submenu) {
            enterSubmenu(focused);
          } else {
            onOpenPreview();
          }
        } else {
          onOpenPreview();
        }
        return;
      }

      // Number keys 1-9
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (submenu) {
          if (idx < submenu.options.length) {
            e.preventDefault();
            const opt = submenu.options[idx];
            if (opt.action) onSelect(opt);
          }
        } else {
          if (idx < topOptions.length) {
            e.preventDefault();
            const opt = topOptions[idx];
            if (opt.submenu) {
              enterSubmenu(opt);
            } else if (opt.action) {
              onSelect(opt);
            }
          }
        }
        return;
      }

      // "0" key — find option with badge "0" in active level
      if (e.key === "0") {
        const opts = submenu ? submenu.options : topOptions;
        const opt = opts.find((o) => o.badge === "0") ?? (opts.length > 9 ? opts[9] : undefined);
        if (opt) {
          e.preventDefault();
          if (opt.action) onSelect(opt);
        }
        return;
      }

      // Character shortcut keys
      if (CHAR_SHORTCUT_KEYS.includes(e.key)) {
        const opts = submenu ? submenu.options : topOptions;
        const opt = opts.find((o) => o.shortcutKey === e.key);
        if (opt) {
          e.preventDefault();
          if (opt.action) onSelect(opt);
        }
        return;
      }

      // Arrow navigation
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (submenu) {
          setSubCursor((i) => Math.min(i + 1, submenu.options.length - 1));
        } else {
          setCursor((i) => Math.min(i + 1, topOptions.length - 1));
        }
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (submenu) {
          setSubCursor((i) => Math.max(i - 1, 0));
        } else {
          setCursor((i) => Math.max(i - 1, 0));
        }
        return;
      }

      // Enter: paste or enter submenu
      if (e.key === "Enter") {
        e.preventDefault();
        const opt = activeOptions[activeCursor];
        if (!opt) return;
        if (opt.submenu) {
          enterSubmenu(opt);
        } else if (opt.action) {
          onSelect(opt);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [topOptions, cursor, submenu, subCursor, onClose, onSelect, onOpenPreview, enterSubmenu, exitSubmenu]);

  return { cursor, setCursor, submenu, subCursor, setSubCursor, enterSubmenu, exitSubmenu, menuRef };
}
