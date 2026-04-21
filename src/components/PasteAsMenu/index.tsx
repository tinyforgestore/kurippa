import cx from "classnames";
import { ClipboardItem } from "@/types";
import { itemDisplayLabel } from "@/utils/format";
import { getPasteOptions, PasteOption } from "@/utils/pasteAs";
import {
  menu,
  menuHeader,
  menuHeaderEmphasis,
  menuOption,
  menuOptionSelected,
  menuNumber,
  menuArrow,
  menuBack,
} from "@/components/PasteAsMenu/index.css";
import { usePasteAsMenu } from "@/hooks/usePasteAsMenu";

const HEADER_TRUNCATE = 40;

interface PasteAsMenuProps {
  item: ClipboardItem;
  onClose: () => void;
  onSelect: (option: PasteOption) => void;
  onCursorChange: (text: string | null) => void;
  onOpenPreview: () => void;
}

export function PasteAsMenu({ item, onClose, onSelect, onCursorChange, onOpenPreview }: PasteAsMenuProps) {
  const topOptions = getPasteOptions(item);
  const preview = itemDisplayLabel(item, HEADER_TRUNCATE);
  const { cursor, setCursor, submenu, subCursor, setSubCursor, enterSubmenu, exitSubmenu, menuRef } = usePasteAsMenu(
    topOptions, onClose, onSelect, onCursorChange, onOpenPreview,
  );

  const activeOptions = submenu ? submenu.options : topOptions;
  const activeCursor = submenu ? subCursor : cursor;
  const setActiveCursor = submenu ? setSubCursor : setCursor;

  return (
    <div ref={menuRef} className={menu}>
      {submenu ? (
        <div className={menuBack} onClick={exitSubmenu}>
          ← {submenu.label}
        </div>
      ) : (
        <div className={menuHeader}>
          Paste as…{" "}
          <span className={menuHeaderEmphasis}>"{preview}"</span>
        </div>
      )}
      {activeOptions.map((opt, i) => {
        const badge = opt.badge ?? opt.shortcutKey ?? (i < 9 ? String(i + 1) : i === 9 ? "0" : null);
        return (
          <div
            key={i}
            data-paste-option
            className={cx(menuOption, { [menuOptionSelected]: i === activeCursor })}
            onMouseMove={() => setActiveCursor(i)}
            onClick={() => {
              if (opt.submenu) {
                enterSubmenu(opt);
              } else if (opt.action) {
                onSelect(opt);
              }
            }}
          >
            {badge !== null && <span className={menuNumber}>{badge}</span>}
            <span style={{ flex: 1 }}>{opt.label}</span>
            {opt.submenu && <span className={menuArrow}>›</span>}
          </div>
        );
      })}
    </div>
  );
}
