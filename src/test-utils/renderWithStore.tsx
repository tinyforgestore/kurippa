import { ReactNode } from "react";
import { createStore, Provider } from "jotai";
import { StoreProvider } from "@/store";
import { MemoryRouter } from "react-router-dom";

export function makeStoreWrapper(options?: { router?: boolean }) {
  const store = createStore();
  function wrapper({ children }: { children: ReactNode }) {
    const inner = (
      <Provider store={store}>
        <StoreProvider>{children}</StoreProvider>
      </Provider>
    );
    return options?.router ? <MemoryRouter>{inner}</MemoryRouter> : inner;
  }
  return { wrapper, store };
}
