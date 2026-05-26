import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { reportPluginIframeHeight } from "./iframeResize";
import "./index.css";

reportPluginIframeHeight();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
