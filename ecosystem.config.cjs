// PM2 process config - RapiDSK Dataspace Connector (FE bundle server).
// Pakai:
//   pm2 start ecosystem.config.cjs
//   pm2 restart ecosystem.config.cjs --update-env
//
// Prioritas config:
// 1. shell env yang sedang aktif
// 2. file .env di root project
// 3. fallback default di file ini
//
// Catatan: server ini menyajikan dist/ (hasil `npm run build`) + proxy /api -> BE.
// Jalankan `npm run build` dulu sebelum start.

const fs = require("fs");
const path = require("path");

const ENV_FILE = path.join(__dirname, ".env");

const parseDotEnv = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
};

const fileEnv = parseDotEnv(ENV_FILE);
const getConfig = (key, fallback = "") => process.env[key] || fileEnv[key] || fallback;

const appName = getConfig("PM2_APP_NAME", "rapidsk-fe");
const rapidskHost = getConfig("RAPIDSK_HOST", "0.0.0.0");
const rapidskPort = getConfig("RAPIDSK_PORT", getConfig("PORT", "8183"));
const nodeEnv = getConfig("NODE_ENV", "production");
const licenseServerUrl = getConfig("RAPIDSK_LICENSE_SERVER_URL", "");
const instanceCount = Number(getConfig("PM2_INSTANCES", "1"));
const execMode = getConfig("PM2_EXEC_MODE", "fork");
const memoryRestart = getConfig("PM2_MAX_MEMORY_RESTART", "512M");
const logDir = getConfig("PM2_LOG_DIR", "./logs");

module.exports = {
  apps: [
    {
      name: appName,
      script: "server/bootstrap.cjs",
      cwd: __dirname,
      instances: Number.isFinite(instanceCount) && instanceCount > 0 ? instanceCount : 1,
      exec_mode: execMode,
      autorestart: true,
      max_restarts: 10,
      watch: false,
      max_memory_restart: memoryRestart,
      env: {
        NODE_ENV: nodeEnv,
        RAPIDSK_PORT: rapidskPort,
        PORT: rapidskPort,
        RAPIDSK_HOST: rapidskHost,
        RAPIDSK_LICENSE_SERVER_URL: licenseServerUrl,
      },
      out_file: `${logDir}/${appName}-out.log`,
      error_file: `${logDir}/${appName}-err.log`,
      time: true,
    },
  ],
};
