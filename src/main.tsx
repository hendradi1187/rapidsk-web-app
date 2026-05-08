import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { KeycloakProvider } from "./auth/KeycloakProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <KeycloakProvider>
    <App />
  </KeycloakProvider>,
);
