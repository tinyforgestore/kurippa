import { useEffect } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { upgradeBanner, bannerMessage, upgradeLink } from "./index.css";

interface Props {
  feature: string;
  onDismiss: () => void;
}

export function UpgradeBanner({ feature, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div className={upgradeBanner}>
      <span className={bannerMessage}>
        &ldquo;{feature}&rdquo; is a paid feature
      </span>
      <button
        className={upgradeLink}
        onClick={() => openUrl("https://tinyforge.store/l/kurippa").catch(console.error)}
      >
        Upgrade →
      </button>
    </div>
  );
}
