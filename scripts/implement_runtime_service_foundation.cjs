const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "src/lib/runtime-config.ts",
  "src/api/client.ts",
  "src/api/services/runtime.ts",
  "src/api/services/adapter-runtime.ts",
  "src/api/services/adapter-service.ts",
  "config/runtime.example.json",
  "config/license-state.example.json",
  "server/bootstrap.cjs",
];

const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const exists = (relativePath) =>
  fs.existsSync(path.join(root, relativePath));

const checks = [
  {
    key: "runtime-config",
    label: "Runtime config helper tersedia",
    test: () => exists("src/lib/runtime-config.ts"),
  },
  {
    key: "logical-clients",
    label: "Logical client terdefinisi",
    test: () => {
      const source = read("src/api/client.ts");
      return ["authClient", "ctsClient", "connectorClient", "adapterClient", "monitoringClient"].every((token) => source.includes(token));
    },
  },
  {
    key: "runtime-service-api",
    label: "Service runtime helper tersedia",
    test: () => {
      const source = read("src/api/services/runtime.ts");
      return source.includes("validateLicense") && source.includes("initializeSetup");
    },
  },
  {
    key: "adapter-runtime-api",
    label: "Adapter runtime helper tersedia",
    test: () => {
      const source = read("src/api/services/adapter-runtime.ts");
      return source.includes("health") && source.includes("publish");
    },
  },
  {
    key: "adapter-service-api",
    label: "Adapter service helper tersedia",
    test: () => {
      const source = read("src/api/services/adapter-service.ts");
      return source.includes("listConnections") && source.includes("ingestGeoServer");
    },
  },
  {
    key: "bootstrap-wrapper",
    label: "Bootstrap wrapper punya runtime-config endpoint",
    test: () => {
      const source = read("server/bootstrap.cjs");
      return source.includes("/runtime-config.json") && source.includes("/setup/status");
    },
  },
  {
    key: "examples",
    label: "Contoh config runtime dan license tersedia",
    test: () => exists("config/runtime.example.json") && exists("config/license-state.example.json"),
  },
];

const missingBaseFiles = requiredFiles.filter((relativePath) => !exists(relativePath));
if (missingBaseFiles.length > 0) {
  console.error("Runtime service foundation belum lengkap. File hilang:");
  missingBaseFiles.forEach((relativePath) => console.error(`- ${relativePath}`));
  process.exit(1);
}

const results = checks.map((item) => {
  try {
    return { ...item, ok: Boolean(item.test()) };
  } catch (error) {
    return { ...item, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

console.log("Runtime service foundation audit\n");
results.forEach((item) => {
  const status = item.ok ? "OK" : "MISSING";
  console.log(`[${status}] ${item.label}`);
  if (item.error) {
    console.log(`  -> ${item.error}`);
  }
});

const failed = results.filter((item) => !item.ok);
if (failed.length > 0) {
  console.error(`\nAudit gagal. ${failed.length} bagian fondasi masih belum lengkap.`);
  process.exit(1);
}

console.log("\nAudit lolos. Fondasi runtime service minimal sudah ada dan bisa dipakai sebagai baseline cleanup berikutnya.");
