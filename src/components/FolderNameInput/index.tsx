import { useFolderNameInput } from "@/hooks/useFolderNameInput";
import { FOLDER_NAME_MAX_LENGTH } from "@/types";
import { container, input } from "./index.css";

interface FolderNameInputProps {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  placeholder?: string;
}

export function FolderNameInput({
  value,
  onChange,
  onConfirm,
  onCancel,
  placeholder = "Folder name",
}: FolderNameInputProps) {
  const { ref } = useFolderNameInput();

  return (
    <div className={container}>
      <input
        ref={ref}
        className={input}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, FOLDER_NAME_MAX_LENGTH))}
        maxLength={FOLDER_NAME_MAX_LENGTH}
        placeholder={placeholder}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
      />
    </div>
  );
}
