import { useCallback, useRef, RefObject } from "react";
import { useSetAtom } from "jotai";
import { LAND_DURATION_MS, LIFT_DURATION_MS } from "@/constants/animation";
import { liftingIdAtom, landingIdAtom } from "@/atoms/clipboard";
import { useClipboardStore } from "@/store";

export function usePinAnimation(
  togglePinItem: (id: number) => Promise<void>,
  listRef: RefObject<HTMLDivElement | null>
) {
  const { liftingId, landingId } = useClipboardStore();
  const setLiftingId = useSetAtom(liftingIdAtom);
  const setLandingId = useSetAtom(landingIdAtom);
  const liftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTogglePin = useCallback(
    (id: number) => {
      if (liftTimerRef.current) clearTimeout(liftTimerRef.current);
      if (landTimerRef.current) clearTimeout(landTimerRef.current);
      setLiftingId(null);
      setLandingId(null);

      setLiftingId(id);
      liftTimerRef.current = setTimeout(() => {
        setLiftingId(null);
        togglePinItem(id)
          .then(() => {
            setLandingId(id);
            listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            landTimerRef.current = setTimeout(() => {
              setLandingId(null);
            }, LAND_DURATION_MS);
          })
          .catch(console.error);
      }, LIFT_DURATION_MS);
    },
    [togglePinItem, listRef, setLiftingId, setLandingId]
  );

  return { liftingId, landingId, handleTogglePin };
}
