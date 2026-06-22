// PM2 process config — RapiDSK Dataspace Connector (FE bundle server).
// Pakai: pm2 start ecosystem.config.cjs
//
// Catatan: server ini menyajikan dist/ (hasil `npm run build`) + proxy /api → BE.
// Jalankan `npm run build` dulu sebelum start.
module.exports = {
  apps: [
    {
      name: "rapidsk-fe",
      script: "server/bootstrap.cjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        RAPIDSK_PORT: "8183",
        RAPIDSK_HOST: "0.0.0.0",
        // Opsional: RAPIDSK_LICENSE_SERVER_URL: "http://license-server",
      },
      out_file: "./logs/rapidsk-out.log",
      error_file: "./logs/rapidsk-err.log",
      time: true,
    },
  ],
};
