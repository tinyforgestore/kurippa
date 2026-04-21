import { toggleBase, toggleOn, toggleOff } from "./index.css";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      className={`${toggleBase} ${checked ? toggleOn : toggleOff}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    />
  );
}
