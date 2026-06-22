import { createRoot } from "react-dom/client";
import "./index.css";
import { initializeRuntime } from "./lib/runtime-config";

const bootstrap = async () => {
  await initializeRuntime();
  const [{ default: App }, { KeycloakProvider }] = await Promise.all([
    import("./App.tsx"),
    import("./auth/KeycloakProvider"),
  ]);

  createRoot(document.getElementById("root")!).render(
    <KeycloakProvider>
      <App />
    </KeycloakProvider>,
  );
};

void bootstrap();
