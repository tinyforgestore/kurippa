import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import appIcon from "@/assets/icon.png";
import { version } from "@pkg";
import { useLicense } from "@/hooks/useLicense";
import { sectionTitle, aboutCard, aboutIcon, aboutName, aboutVer, aboutBuilt, link, divider, rowLabel, rowDesc, rowError, addBtn, deactivateConfirmRow } from "./index.css";
import { vars } from "@/theme.css";

export function AboutTab() {
  const { mode, licenseInfo, deactivate, openActivationWindow } = useLicense();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const handleDeactivate = () => {
    setDeactivating(true);
    deactivate()
      .then(() => {
        setConfirmDeactivate(false);
        setDeactivating(false);
      })
      .catch(() => setDeactivating(false));
  };

  return (
    <>
      <div className={sectionTitle}>About</div>
      <div className={aboutCard}>
        <div className={aboutIcon}>
          <img src={appIcon} width={36} height={36} draggable={false} />
        </div>
        <div className={aboutName}>Kurippa</div>
        <div className={aboutVer}>Version {version}</div>
        <div className={aboutBuilt}>Built with Tauri + Rust by TinyForge</div>
        <a
          className={link}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            openUrl("https://tinyforge.store").catch(console.error);
          }}
        >
          tinyforge.store
        </a>
      </div>

      <div className={divider} />

      <div className={sectionTitle}>License</div>

      {mode === "activated" && (
        <>
          <div className={rowLabel}>
            Licensed <span style={{ color: vars.accent.green }}>✓</span>
          </div>
          <div className={rowDesc}>store.tinyforge.kurippa · 2 of 3 devices active</div>
          {licenseInfo && (
            <div className={rowDesc}>{licenseInfo.licenseKey.slice(0, 9)}••••</div>
          )}
          {!confirmDeactivate ? (
            <button className={addBtn} onClick={() => setConfirmDeactivate(true)}>
              Deactivate this device
            </button>
          ) : (
            <>
              <div className={rowDesc}>
                Deactivate Kurippa on this device? You can reactivate later.
              </div>
              <div className={deactivateConfirmRow}>
                <button className={addBtn} onClick={() => setConfirmDeactivate(false)}>
                  Cancel
                </button>
                <button className={addBtn} onClick={handleDeactivate} disabled={deactivating}>
                  {deactivating ? "Deactivating…" : "Deactivate"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {(mode === "trial" || mode === "first_launch") && (
        <>
          <div className={rowLabel}>Free trial · History limited to 15 items</div>
          <button className={addBtn} onClick={openActivationWindow}>
            Enter license key
          </button>
        </>
      )}

      {mode === "device_limit" && (
        <>
          <div className={rowError}>Device limit reached (3/3)</div>
          <div className={rowDesc}>
            Your license is already active on 3 devices. Deactivate one from{" "}
            <button className={link} onClick={() => openUrl("https://tinyforge.store/account").catch(console.error)}>
              tinyforge.store/account
            </button>{" "}
            or on that device, then re-activate here.
          </div>
          <button className={addBtn} onClick={openActivationWindow}>
            Retry activation
          </button>
        </>
      )}
    </>
  );
}
