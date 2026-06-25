// PM2 process config - RapiDSK Dataspace Connector (FE bundle server).
// Pakai:
//   pm2 start ecosystem.config.cjs
//   pm2 restart ecosystem.config.cjs --update-env
//
// Semua nilai penting dibaca dari environment variable supaya port/host
// dan runtime lain bisa diganti tanpa edit file ini lagi.
//
// Catatan: server ini menyajikan dist/ (hasil `npm run build`) + proxy /api -> BE.
// Jalankan `npm run build` dulu sebelum start.

const appName = process.env.PM2_APP_NAME || "rapidsk-fe";
const rapidskHost = process.env.RAPIDSK_HOST || "0.0.0.0";
const rapidskPort = process.env.RAPIDSK_PORT || process.env.PORT || "8183";
const nodeEnv = process.env.NODE_ENV || "production";
const licenseServerUrl = process.env.RAPIDSK_LICENSE_SERVER_URL || "";
const instanceCount = Number(process.env.PM2_INSTANCES || 1);
const execMode = process.env.PM2_EXEC_MODE || "fork";
const memoryRestart = process.env.PM2_MAX_MEMORY_RESTART || "512M";
const logDir = process.env.PM2_LOG_DIR || "./logs";

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
