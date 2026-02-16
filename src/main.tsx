import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initCapacitor } from "./lib/capacitor";

createRoot(document.getElementById("root")!).render(<App />);

// Initialize Capacitor plugins for native platforms
initCapacitor();
