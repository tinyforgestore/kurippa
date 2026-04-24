import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "jotai";
import { StoreProvider } from "@/store";
import App from "@/components/App";

document.addEventListener("contextmenu", (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider>
      <StoreProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </StoreProvider>
    </Provider>
  </React.StrictMode>,
);
