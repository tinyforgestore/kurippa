import { useCallback, useRef, useState, RefObject } from "react";
import { LAND_DURATION_MS, LIFT_DURATION_MS } from "@/constants/animation";

export function usePinAnimation(
  togglePinItem: (id: number) => Promise<void>,
  listRef: RefObject<HTMLDivElement | null>
) {
  const [liftingId, setLiftingId] = useState<number | null>(null);
  const [landingId, setLandingId] = useState<number | null>(null);
  const liftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTogglePin = useCallback(
    (id: number) => {
      // Cancel any in-flight animation
      if (liftTimerRef.current) clearTimeout(liftTimerRef.current);
      if (landTimerRef.current) clearTimeout(landTimerRef.current);
      setLiftingId(null);
      setLandingId(null);

      setLiftingId(id);
      // Wait for lift animation, then commit the pin
      liftTimerRef.current = setTimeout(() => {
        setLiftingId(null);
        togglePinItem(id)
          .then(() => {
            // List has reordered — now trigger the landing animation
            setLandingId(id);
            listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            landTimerRef.current = setTimeout(() => {
              setLandingId(null);
            }, LAND_DURATION_MS);
          })
          .catch(console.error);
      }, LIFT_DURATION_MS);
    },
    [togglePinItem, listRef]
  );

  return { liftingId, landingId, handleTogglePin };
}
