import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import QuickNote from "./components/QuickNote";
import ReminderOverlay from "./components/ReminderOverlay";
import "./index.css";

const params = new URLSearchParams(window.location.search);
const isQuickNote = params.has("quicknote");
const isReminderOverlay = params.has("reminderOverlay");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isReminderOverlay ? <ReminderOverlay /> : isQuickNote ? <QuickNote /> : <App />}
  </React.StrictMode>,
);
