import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { openUrl } from "@tauri-apps/plugin-opener";
import appIcon from "@/assets/icon.png";
import { vars } from "@/theme.css";
import { MOD_KEY, SHIFT_KEY, isMac } from "@/utils/platformKeys";
import {
  container,
  header,
  appIcon as appIconStyle,
  appName,
  appSubtitle,
  form,
  label,
  input,
  inputError,
  errorMsg,
  activateBtn,
  divider,
  buyRow,
  buyBtnPrimary,
  buyBtnOutline,
  buyCaption,
  spinAnimation,
  checkPopAnimation,
  checkStrokeAnimation,
  ringPulseAnimation,
  autoCloseAnimation,
  celebrationWrap,
  receiptBlock,
  shortcutTeaser,
  shortcutKey,
  celebrationCtaBtn,
  autoCloseBar,
} from "./index.css";

const BUY_URL = "https://tinyforge.store/l/kurippa";

interface ActivationDetails {
  planName: string;
  emailMasked: string;
  deviceCount: number;
  deviceLimit: number;
  expiresLabel: string;
}

const CONFETTI_PALETTE = [
  vars.accent.blue,
  vars.accent.blueAlt,
  vars.accent.green,
  vars.accent.mauve,
  "#f5b080",
  vars.accent.red,
  "#d9c579",
];

const CONFETTI_KEYFRAMES = `
  @keyframes kurippa-confetti {
    0%   { transform: translate(0,0) rotate(0deg) scale(0.6); opacity: 0; }
    15%  { opacity: 1; }
    100% { transform: translate(var(--kp-tx), var(--kp-ty)) rotate(var(--kp-rot)) scale(1); opacity: 0; }
  }
`;

const CONFETTI_PIECES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2;
  const dist = 70 + Math.random() * 60;
  return {
    id: i,
    tx: Math.cos(angle) * dist,
    ty: Math.sin(angle) * dist - 10,
    rot: Math.random() * 720 - 360,
    color: CONFETTI_PALETTE[i % CONFETTI_PALETTE.length],
    w: 4 + Math.random() * 4,
    h: 7 + Math.random() * 6,
    delay: Math.random() * 0.15,
  };
});

function ConfettiBurst() {
  const pieces = CONFETTI_PIECES;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <style>{CONFETTI_KEYFRAMES}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: "50%",
            top: "38%",
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: 1,
            ["--kp-tx" as string]: `${p.tx}px`,
            ["--kp-ty" as string]: `${p.ty}px`,
            ["--kp-rot" as string]: `${p.rot}deg`,
            animation: `kurippa-confetti 1.4s cubic-bezier(0.2,0.6,0.2,1) ${p.delay}s forwards`,
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
}

function CelebrationIcon() {
  return (
    <div style={{
      position: "relative",
      width: 72,
      height: 72,
      marginBottom: 18,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        border: `2px solid ${vars.accent.green}`,
        animation: `${ringPulseAnimation} 1.2s ease-out forwards`,
      }} />
      <div style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: vars.accent.green,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 0 6px ${vars.accent.green}22, 0 8px 24px ${vars.accent.green}44`,
        animation: `${checkPopAnimation} 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards`,
      }}>
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none"
             stroke="#0a0a0a" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
          <polyline
            points="5 12.5 10 17.5 19 7.5"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 24,
              animation: `${checkStrokeAnimation} 0.4s ease-out 0.25s forwards`,
            }}
          />
        </svg>
      </div>
    </div>
  );
}

function CelebrationBody({ details }: { details: ActivationDetails }) {
  const handleFinish = () => {
    invoke("finish_activation_cmd").catch(console.error);
  };

  useEffect(() => {
    const t = setTimeout(handleFinish, 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={celebrationWrap}>
      <ConfettiBurst />
      <CelebrationIcon />

      <div style={{ fontSize: 20, fontWeight: 600, color: vars.text.high, marginBottom: 6, textAlign: "center" }}>
        You're activated
      </div>
      <div style={{ fontSize: 12, color: vars.text.dimmer, marginBottom: 22, textAlign: "center" }}>
        Unlimited history is on. Thank you for supporting TinyForge.
      </div>

      <div className={receiptBlock}>
        <span style={{ color: vars.text.dimmer }}>Plan</span>
        <span style={{ color: vars.text.high, textAlign: "right" }}>{details.planName}</span>
        <span style={{ color: vars.text.dimmer }}>Email</span>
        <span style={{ color: vars.text.mid, textAlign: "right" }}>{details.emailMasked}</span>
        <span style={{ color: vars.text.dimmer }}>This device</span>
        <span style={{ color: vars.text.mid, textAlign: "right" }}>
          {details.deviceCount} of {details.deviceLimit} activated
        </span>
        <span style={{ color: vars.text.dimmer }}>Expires</span>
        <span style={{ color: vars.text.mid, textAlign: "right" }}>{details.expiresLabel}</span>
      </div>

      <div className={shortcutTeaser}>
        Press
        <span className={shortcutKey}>{`${MOD_KEY} ${SHIFT_KEY} ${isMac ? "C" : "V"}`}</span>
        to open your clipboard
      </div>

      <button className={celebrationCtaBtn} onClick={handleFinish}>
        Start using Kurippa
      </button>

      <div
        className={autoCloseBar}
        style={{
          background: `${vars.accent.blueAlt}66`,
          animation: `${autoCloseAnimation} 5s linear forwards`,
        }}
      />
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: "inline-block",
      width: 12,
      height: 12,
      border: `1.5px solid ${vars.text.dimmest}`,
      borderTopColor: vars.text.high,
      borderRadius: "50%",
      animation: `${spinAnimation} 0.8s linear infinite`,
    }} />
  );
}

function mapError(err: string): string {
  if (err.includes("InvalidKey")) return "Invalid license key — check your purchase email";
  if (err.includes("DeviceLimitReached")) return "Device limit reached (3/3) — deactivate another device first";
  if (err.includes("NetworkError")) return "Could not connect — check your internet connection · Try again";
  if (err.includes("AlreadyActivated")) return "Invalid license key — check your purchase email";
  return "Activation failed. Try again.";
}

export function LicenseActivation() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState<ActivationDetails | null>(null);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setActivated(null);
        setKey("");
        setError(null);
        setLoading(false);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (activated) {
    return <CelebrationBody details={activated} />;
  }

  const handleActivate = () => {
    if (!key.trim() || loading) return;
    setError(null);
    setLoading(true);
    invoke<ActivationDetails>("activate_license_cmd", { key: key.trim() })
      .then((details) => {
        setLoading(false);
        setActivated(details);
      })
      .catch((err: string) => {
        setLoading(false);
        setError(mapError(err));
        if (err.includes("DeviceLimitReached")) {
          load("app-store.json")
            .then((store) => {
              store.set("device_limit", true);
              return store.save();
            })
            .catch(console.error);
        }
      });
  };

  const handleTrial = () => {
    invoke("set_free_trial_cmd").catch(console.error);
  };

  return (
    <div className={container}>
      <div className={header}>
        <img className={appIconStyle} src={appIcon} alt="Kurippa" draggable={false} />
        <div className={appName}>Kurippa</div>
        <div className={appSubtitle}>Keyboard-first clipboard manager</div>
      </div>

      <div className={form}>
        <div className={label}>License key</div>
        <input
          ref={inputRef}
          className={`${input} ${error ? inputError : ""}`}
          type="text"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleActivate();
          }}
          disabled={loading}
        />
        <div className={errorMsg}>{error ?? ""}</div>
        <button className={activateBtn} onClick={handleActivate} disabled={!key.trim() || loading}>
          {loading && <Spinner />}
          {loading ? "Activating…" : "Activate Kurippa"}
        </button>
      </div>

      <div className={divider} />

      <div className={buyRow}>
        <button
          className={buyBtnPrimary}
          onClick={() => openUrl(BUY_URL).catch(console.error)}
        >
          Buy Kurippa →
        </button>
        <button className={buyBtnOutline} onClick={handleTrial}>
          Free trial
        </button>
      </div>
      <div className={buyCaption}>
        One-time purchase · unlimited history — Trial keeps the last 15 items
      </div>
    </div>
  );
}
