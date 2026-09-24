import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);


// ============================================================
// SAHAAI SERVICE WORKER
// ============================================================

if ("serviceWorker" in navigator) {

  window.addEventListener("load", () => {

    navigator.serviceWorker
      .register("/sw.js")

      .then((registration) => {

        console.log(
          "SahaAI service worker registered:",
          registration.scope
        );

      })

      .catch((error) => {

        console.error(
          "SahaAI service worker registration failed:",
          error
        );

      });

  });

}