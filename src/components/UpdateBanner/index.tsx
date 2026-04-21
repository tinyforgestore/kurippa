import { updateBanner, updateMessage, updateActions, updateInstall, updateDismiss } from "./index.css";

interface UpdateBannerProps {
  version: string;
  onInstall: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({ version, onInstall, onDismiss }: UpdateBannerProps) {
  return (
    <div className={updateBanner}>
      <span className={updateMessage}>Kurippa {version} available</span>
      <div className={updateActions}>
        <button className={updateInstall} onClick={onInstall}>Install</button>
        <button className={updateDismiss} onClick={onDismiss}>✕</button>
      </div>
    </div>
  );
}
