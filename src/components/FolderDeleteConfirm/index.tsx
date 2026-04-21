import { useFolderDeleteConfirm } from "@/hooks/useFolderDeleteConfirm";
import { container, confirmButton, hint, title } from "./index.css";

interface FolderDeleteConfirmProps {
  folderName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FolderDeleteConfirm({ folderName, onConfirm, onCancel }: FolderDeleteConfirmProps) {
  useFolderDeleteConfirm(onConfirm, onCancel);

  return (
    <div className={container}>
      <div className={title}>Delete &ldquo;{folderName}&rdquo; and all entries inside?</div>
      <div className={confirmButton} onClick={onConfirm}>
        Yes, delete
      </div>
      <div className={hint}>Enter / Y to confirm &middot; Esc to cancel</div>
    </div>
  );
}
