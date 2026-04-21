import { Settings, Keyboard, Shield, Info } from "lucide-react";
import { navIcon } from "./index.css";

export function GeneralIcon() {
  return <Settings size={16} className={navIcon} />;
}

export function HotkeysIcon() {
  return <Keyboard size={16} className={navIcon} />;
}

export function PrivacyIcon() {
  return <Shield size={16} className={navIcon} />;
}

export function AboutIcon() {
  return <Info size={16} className={navIcon} />;
}
