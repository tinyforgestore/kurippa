import { act } from "@testing-library/react";

export function flushEffects(): Promise<void> {
  return act(async () => {
    await Promise.resolve();
  });
}
