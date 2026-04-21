import { useEffect, useRef } from "react";

export function useFolderNameInput() {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return { ref };
}
