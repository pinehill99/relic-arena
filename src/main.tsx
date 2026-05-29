import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { runAssertions } from "./engine/assertions";

if (import.meta.env.DEV) {
  const results = runAssertions();
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error("[Relic Arena] Assertion failures:", failed);
  } else {
    console.info("[Relic Arena] All %d startup assertions passed.", results.length);
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
