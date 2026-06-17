import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import QuickNote from "./components/QuickNote";
import "./index.css";

const isQuickNote = new URLSearchParams(window.location.search).has("quicknote");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isQuickNote ? <QuickNote /> : <App />}
  </React.StrictMode>,
);
