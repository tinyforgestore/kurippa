import { useNavigate } from "react-router-dom";
import { ClipboardItem } from "@/types";

export function useAppNavigation() {
  const navigate = useNavigate();
  return {
    toHistory: () => navigate("/"),
    toPasteAs: (item: ClipboardItem) => navigate("/paste-as", { state: { item } }),
    toSeparatorPicker: () => navigate("/separator-picker"),
    toFolderNameInput: (
      mode: "create" | "rename",
      targetId: number | null,
      pickerItemId: number | null
    ) => navigate("/folder-name-input", { state: { mode, targetId, pickerItemId } }),
    toFolderDelete: (target: { id: number; name: string }) =>
      navigate("/folder-delete", { state: { target } }),
    toFolderPicker: (itemId: number) => navigate("/folder-picker", { state: { itemId } }),
  };
}
