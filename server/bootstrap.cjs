const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { URL } = require("url");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const CONFIG_DIR = path.join(ROOT_DIR, "config");
const RUNTIME_CONFIG_PATH = path.join(CONFIG_DIR, "runtime.json");
const LICENSE_STATE_PATH = path.join(CONFIG_DIR, "license-state.json");
const PORT = Number(process.env.RAPIDSK_PORT || process.env.PORT || 8282);
const HOST = process.env.RAPIDSK_HOST || "0.0.0.0";
const LICENSE_SERVER_URL = process.env.RAPIDSK_LICENSE_SERVER_URL || "";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const ensureConfigDir = async () => {
  await fsp.mkdir(CONFIG_DIR, { recursive: true });
};

const checkServerPermissions = async () => {
  const writeTestPath = path.join(CONFIG_DIR, ".permission-check.tmp");
  try {
    await ensureConfigDir();
    await fsp.writeFile(writeTestPath, "ok", "utf8");
    await fsp.unlink(writeTestPath);
    return {
      ok: true,
      message: `Config directory writable (${CONFIG_DIR}).`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `Config directory tidak writable: ${error instanceof Error ? error.message : "unknown error"}.`,
    };
  }
};

const maskLicenseKey = (value) => {
  if (!value) return "";
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}-${"*".repeat(Math.max(value.length - 8, 4))}-${value.slice(-4)}`;
};

const readJsonFile = async (filePath) => {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeJsonFile = async (filePath, payload) => {
  await ensureConfigDir();
  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
};

const parseRequestBody = async (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON payload"));
      }
    });
    req.on("error", reject);
  });

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
};

const sendText = (res, status, payload) => {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
};

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const getPublicRuntimeConfig = (runtimeConfig) => {
  if (!runtimeConfig) return null;
  return {
    initialized: Boolean(runtimeConfig.initialized),
    publicAppUrl: runtimeConfig.publicAppUrl || "",
    apiBaseUrl: runtimeConfig.apiBaseUrl || "",
    adapterEndpoint: runtimeConfig.adapterEndpoint || "",
    sso: {
      enabled: Boolean(runtimeConfig.sso?.enabled),
      keycloakUrl: runtimeConfig.sso?.keycloakUrl || "",
      realm: runtimeConfig.sso?.realm || "",
      clientId: runtimeConfig.sso?.clientId || "",
    },
  };
};

const sanitizeLicenseState = (licenseState) => {
  if (!licenseState) return null;
  return {
    licenseKeyMasked: licenseState.licenseKeyMasked || "",
    licenseStatus: licenseState.licenseStatus || "UNKNOWN",
    licensedHost: licenseState.licensedHost || "",
    activatedAt: licenseState.activatedAt || null,
    expiresAt: licenseState.expiresAt || null,
    lastValidationAt: licenseState.lastValidationAt || null,
  };
};

const getSetupStatus = async () => {
  const runtimeConfig = await readJsonFile(RUNTIME_CONFIG_PATH);
  const licenseState = await readJsonFile(LICENSE_STATE_PATH);
  const permissionState = await checkServerPermissions();
  const configValid = Boolean(
    runtimeConfig &&
      runtimeConfig.initialized &&
      isValidHttpUrl(runtimeConfig.publicAppUrl) &&
      isValidHttpUrl(runtimeConfig.apiBaseUrl),
  );
  const licenseValid = Boolean(
    licenseState &&
      licenseState.licenseStatus &&
      !["INVALID", "EXPIRED", "REVOKED"].includes(String(licenseState.licenseStatus).toUpperCase()),
  );

  return {
    initialized: configValid && licenseValid,
    configValid,
    licenseValid,
    serverPermissionValid: permissionState.ok,
    needsSetup: !(configValid && licenseValid && permissionState.ok),
    warnings: [],
    blockingErrors: [
      ...(permissionState.ok ? [] : [permissionState.message]),
      ...(configValid ? [] : ["Runtime config belum valid atau belum diinisialisasi."]),
      ...(licenseValid ? [] : ["License belum aktif atau tidak valid."]),
    ],
    runtimeConfig,
    licenseState,
  };
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const extractHost = (urlString) => {
  try {
    return new URL(urlString).host;
  } catch {
    return "";
  }
};

const validateLicenseKeyLocally = (licenseKey) => /^(POC|RAPIDSK)-[A-Z0-9-]{8,}$/i.test(licenseKey);

const performLicenseValidation = async ({ licenseKey, publicAppUrl }) => {
  const warnings = [];
  const blockingErrors = [];
  const licensedHost = extractHost(publicAppUrl);

  if (!licenseKey || !validateLicenseKeyLocally(licenseKey)) {
    blockingErrors.push("Format license key tidak valid untuk runtime wrapper demo.");
  }

  if (!isValidHttpUrl(publicAppUrl)) {
    blockingErrors.push("Public App URL tidak valid.");
  }

  let status = "INVALID";
  let expiresAt = null;

  if (blockingErrors.length > 0) {
    return {
      valid: false,
      status,
      licensedHost,
      warnings,
      blockingErrors,
      expiresAt,
      usedFallback: false,
    };
  }

  if (LICENSE_SERVER_URL) {
    try {
      const response = await fetchWithTimeout(
        LICENSE_SERVER_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            licenseKey,
            publicAppUrl,
            licensedHost,
          }),
        },
        6000,
      );

      if (response.ok) {
        const payload = await response.json();
        const remoteStatus = String(payload.status || "ACTIVE").toUpperCase();
        const remoteHost = payload.licensedHost || licensedHost;
        expiresAt = payload.expiresAt || null;
        if (remoteHost !== licensedHost) {
          blockingErrors.push(
            `License host mismatch. Expected ${remoteHost}, got ${licensedHost}.`,
          );
        }
        if (["INVALID", "REVOKED", "EXPIRED"].includes(remoteStatus)) {
          blockingErrors.push(`License server returned ${remoteStatus}.`);
        }
        status = remoteStatus;
        return {
          valid: blockingErrors.length === 0,
          status,
          licensedHost: remoteHost,
          warnings,
          blockingErrors,
          expiresAt,
          usedFallback: false,
        };
      }

      warnings.push(`License server returned HTTP ${response.status}. Using demo fallback validation.`);
    } catch (error) {
      warnings.push(
        `License server tidak dapat dijangkau (${error instanceof Error ? error.message : "unknown error"}). Using POC fallback validation.`,
      );
    }
  } else {
    warnings.push("License server belum dikonfigurasi. Menggunakan fallback demo validation.");
  }

  status = "ACTIVE";
  return {
    valid: true,
    status,
    licensedHost,
    warnings,
    blockingErrors,
    expiresAt,
    usedFallback: true,
  };
};

const validateSetupPayload = async ({ apiBaseUrl, publicAppUrl, adapterEndpoint, sso }) => {
  const checks = [];
  const warnings = [];
  const blockingErrors = [];
  const permissionState = await checkServerPermissions();

  checks.push({
    key: "server-permission",
    label: "Server Runtime Permission",
    status: permissionState.ok ? "pass" : "fail",
    message: permissionState.ok
      ? "Wrapper dapat menulis file konfigurasi dan status lisensi."
      : permissionState.message,
  });

  if (!permissionState.ok) {
    blockingErrors.push("Wrapper tidak punya izin menulis konfigurasi server.");
  }

  if (!isValidHttpUrl(publicAppUrl)) {
    checks.push({
      key: "public-app-url",
      label: "Public App URL",
      status: "fail",
      message: "Public App URL tidak valid.",
    });
    blockingErrors.push("Public App URL tidak valid.");
  } else {
    checks.push({
      key: "public-app-url",
      label: "Public App URL",
      status: "pass",
      message: `Bound to ${extractHost(publicAppUrl)}.`,
    });
  }

  if (!isValidHttpUrl(apiBaseUrl)) {
    checks.push({
      key: "api-base-url",
      label: "API Base URL",
      status: "fail",
      message: "API Base URL harus berupa URL http/https lengkap.",
    });
    blockingErrors.push("API Base URL tidak valid.");
    return { checks, warnings, blockingErrors };
  }

  const apiUrl = new URL(apiBaseUrl);
  const apiRoot = apiBaseUrl.replace(/\/api\/v\d+\/?$/, "");

  try {
    const rootResponse = await fetchWithTimeout(apiUrl.origin, { method: "GET" }, 5000);
    checks.push({
      key: "api-origin",
      label: "Backend Reachability",
      status: rootResponse.ok ? "pass" : "warning",
      message: rootResponse.ok
        ? `Backend origin reachable (${apiUrl.origin}).`
        : `Backend origin reachable but returned HTTP ${rootResponse.status}.`,
    });
    if (!rootResponse.ok) {
      warnings.push(`Backend origin reachable but returned HTTP ${rootResponse.status}.`);
    }
  } catch (error) {
    checks.push({
      key: "api-origin",
      label: "Backend Reachability",
      status: "fail",
      message: `Tidak dapat menjangkau backend origin: ${error instanceof Error ? error.message : "unknown error"}.`,
    });
    blockingErrors.push("Backend tidak dapat dijangkau dari wrapper.");
  }

  try {
    const openApiResponse = await fetchWithTimeout(`${apiRoot}/openapi.json`, { method: "GET" }, 5000);
    if (openApiResponse.ok) {
      checks.push({
        key: "openapi",
        label: "OpenAPI Spec",
        status: "pass",
        message: "Endpoint /openapi.json tersedia.",
      });
    } else {
      checks.push({
        key: "openapi",
        label: "OpenAPI Spec",
        status: "warning",
        message: `Endpoint /openapi.json mengembalikan HTTP ${openApiResponse.status}.`,
      });
      warnings.push("OpenAPI endpoint belum tersedia. Ini tidak memblok setup POC.");
    }
  } catch (error) {
    checks.push({
      key: "openapi",
      label: "OpenAPI Spec",
      status: "warning",
      message: `OpenAPI check gagal: ${error instanceof Error ? error.message : "unknown error"}.`,
    });
    warnings.push("OpenAPI endpoint belum tersedia atau tidak dapat dijangkau.");
  }

  const normalizedAdapterEndpoint = normalizeBaseUrl(adapterEndpoint);
  if (!normalizedAdapterEndpoint) {
    checks.push({
      key: "adapter-endpoint",
      label: "Adapter Service",
      status: "warning",
      message: "Adapter service belum diisi. Wizard provider belum bisa menjalankan ingestion sampai endpoint ini dilengkapi.",
    });
    warnings.push("Adapter service belum diisi. Ini tidak memblok setup wrapper.");
  } else if (!isValidHttpUrl(normalizedAdapterEndpoint)) {
    checks.push({
      key: "adapter-endpoint",
      label: "Adapter Service",
      status: "fail",
      message: "Adapter service harus berupa URL http/https lengkap.",
    });
    blockingErrors.push("Adapter service tidak valid.");
  } else {
    try {
      const adapterResponse = await fetchWithTimeout(normalizedAdapterEndpoint, { method: "GET" }, 5000);
      checks.push({
        key: "adapter-endpoint",
        label: "Adapter Service",
        status: adapterResponse.ok ? "pass" : "warning",
        message: adapterResponse.ok
          ? `Adapter service reachable (${normalizedAdapterEndpoint}).`
          : `Adapter service reachable but returned HTTP ${adapterResponse.status}.`,
      });
      if (!adapterResponse.ok) {
        warnings.push(`Adapter service reachable but returned HTTP ${adapterResponse.status}.`);
      }
    } catch (error) {
      checks.push({
        key: "adapter-endpoint",
        label: "Adapter Service",
        status: "warning",
        message: `Adapter service belum merespons: ${error instanceof Error ? error.message : "unknown error"}.`,
      });
      warnings.push("Adapter service belum dapat dijangkau. Ini tidak memblok setup POC.");
    }
  }

  if (!sso?.enabled) {
    checks.push({
      key: "sso",
      label: "Keycloak / SSO",
      status: "warning",
      message: "SSO belum diaktifkan. Login lokal tetap aktif.",
    });
    warnings.push("SSO belum diaktifkan untuk instance ini.");
  } else if (!isValidHttpUrl(sso.keycloakUrl) || !sso.realm || !sso.clientId) {
    checks.push({
      key: "sso",
      label: "Keycloak / SSO",
      status: "fail",
      message: "Konfigurasi SSO belum lengkap.",
    });
    blockingErrors.push("Konfigurasi SSO belum lengkap.");
  } else {
    const wellKnown = `${sso.keycloakUrl.replace(/\/$/, "")}/realms/${encodeURIComponent(
      sso.realm,
    )}/.well-known/openid-configuration`;
    try {
      const ssoResponse = await fetchWithTimeout(wellKnown, { method: "GET" }, 5000);
      if (ssoResponse.ok) {
        checks.push({
          key: "sso",
          label: "Keycloak / SSO",
          status: "pass",
          message: "Keycloak realm reachable.",
        });
      } else {
        checks.push({
          key: "sso",
          label: "Keycloak / SSO",
          status: "warning",
          message: `Keycloak returned HTTP ${ssoResponse.status}.`,
        });
        warnings.push("Keycloak endpoint reachable tetapi belum mengembalikan metadata OIDC yang diharapkan.");
      }
    } catch (error) {
      checks.push({
        key: "sso",
        label: "Keycloak / SSO",
        status: "warning",
        message: `Keycloak check gagal: ${error instanceof Error ? error.message : "unknown error"}.`,
      });
      warnings.push("Keycloak endpoint belum aktif. Untuk mode demo ini tidak memblok setup.");
    }
  }

  return { checks, warnings, blockingErrors };
};

const inspectConnectionPoolTargets = async ({ endpoint, wellKnownJwtUrl }) => {
  const checks = [];
  const blockingErrors = [];

  if (!isValidHttpUrl(endpoint)) {
    blockingErrors.push("Connector endpoint tidak valid.");
  }
  if (!isValidHttpUrl(wellKnownJwtUrl)) {
    blockingErrors.push("Well-known JWT URL tidak valid.");
  }
  if (blockingErrors.length > 0) {
    return { ok: false, checks, blockingErrors };
  }

  try {
    const endpointResponse = await fetchWithTimeout(endpoint, { method: "GET" }, 5000);
    checks.push({
      key: "endpoint",
      status: endpointResponse.ok ? "pass" : "fail",
      httpStatus: endpointResponse.status,
      message: endpointResponse.ok
        ? "Connector endpoint merespons."
        : `Connector endpoint mengembalikan HTTP ${endpointResponse.status}.`,
    });
    if (!endpointResponse.ok) {
      blockingErrors.push(`Connector endpoint mengembalikan HTTP ${endpointResponse.status}.`);
    }
  } catch (error) {
    checks.push({
      key: "endpoint",
      status: "fail",
      httpStatus: null,
      message: `Connector endpoint tidak dapat dijangkau: ${error instanceof Error ? error.message : "unknown error"}.`,
    });
    blockingErrors.push("Connector endpoint tidak dapat dijangkau dari wrapper.");
  }

  try {
    const jwksResponse = await fetchWithTimeout(wellKnownJwtUrl, { method: "GET" }, 5000);
    const jwksPayload = jwksResponse.ok ? await jwksResponse.json() : null;
    const hasKeys = Boolean(Array.isArray(jwksPayload?.keys) && jwksPayload.keys.length > 0);
    checks.push({
      key: "jwks",
      status: jwksResponse.ok && hasKeys ? "pass" : "fail",
      httpStatus: jwksResponse.status,
      message: jwksResponse.ok
        ? hasKeys
          ? "JWKS merespons dan memiliki daftar keys."
          : "JWKS merespons tetapi format keys tidak ditemukan."
        : `JWKS mengembalikan HTTP ${jwksResponse.status}.`,
    });
    if (!jwksResponse.ok) {
      blockingErrors.push(`JWKS mengembalikan HTTP ${jwksResponse.status}.`);
    } else if (!hasKeys) {
      blockingErrors.push("JWKS tidak berisi keys yang bisa dipakai.");
    }
  } catch (error) {
    checks.push({
      key: "jwks",
      status: "fail",
      httpStatus: null,
      message: `JWKS tidak dapat dijangkau: ${error instanceof Error ? error.message : "unknown error"}.`,
    });
    blockingErrors.push("JWKS tidak dapat dijangkau dari wrapper.");
  }

  return {
    ok: blockingErrors.length === 0,
    checks,
    blockingErrors,
  };
};

const buildRuntimeConfig = ({ apiBaseUrl, publicAppUrl, adapterEndpoint, sso }) => ({
  initialized: true,
  apiBaseUrl,
  publicAppUrl,
  adapterEndpoint: normalizeBaseUrl(adapterEndpoint),
  sso: {
    enabled: Boolean(sso?.enabled),
    keycloakUrl: sso?.keycloakUrl || "",
    realm: sso?.realm || "",
    clientId: sso?.clientId || "",
  },
});

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const deriveRoleFromPayload = (payload) => {
  if (!payload) return "VIEWER";
  const categoryCode = String(payload.category?.code || "").toUpperCase();
  const groupCode = String(payload.group?.code || "").toUpperCase();
  if (payload.is_superadmin) return "SUPER_ADMIN";
  if (groupCode.includes("ADMIN")) return "ADMIN";
  if (groupCode.includes("PROVIDER") || categoryCode.includes("PROVIDER") || categoryCode.includes("KKKS")) {
    return "PROVIDER";
  }
  if (groupCode.includes("CONSUMER") || categoryCode.includes("CONSUMER") || categoryCode.includes("SKK")) {
    return "CONSUMER";
  }
  return "VIEWER";
};

const requireAdmin = (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const payload = decodeJwtPayload(token);
  const role = deriveRoleFromPayload(payload);
  if (!token || !["SUPER_ADMIN", "ADMIN"].includes(role)) {
    sendJson(res, 403, { error: "Admin runtime access required." });
    return false;
  }
  return true;
};

const requireAuthenticated = (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const payload = decodeJwtPayload(token);
  if (!token || !payload) {
    sendJson(res, 401, { error: "Authenticated runtime access required." });
    return false;
  }
  return true;
};

const proxyRequest = async (req, res, targetUrl) => {
  const bodyAllowed = !["GET", "HEAD"].includes(req.method || "GET");
  let requestBody = undefined;

  if (bodyAllowed) {
    requestBody = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });
  }

  const headers = { ...req.headers };
  delete headers.host;
  delete headers["content-length"];

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: bodyAllowed ? requestBody : undefined,
    redirect: "manual",
  });

  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    responseHeaders[key] = value;
  });
  res.writeHead(response.status, responseHeaders);
  const arrayBuffer = await response.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
};

const serveStaticFile = async (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const data = await fsp.readFile(filePath);
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  res.end(data);
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (req.method === "GET" && pathname === "/setup/status") {
      const status = await getSetupStatus();
      return sendJson(res, 200, {
        initialized: status.initialized,
        configValid: status.configValid,
        licenseValid: status.licenseValid,
        serverPermissionValid: status.serverPermissionValid,
        needsSetup: status.needsSetup,
        warnings: status.warnings,
        blockingErrors: status.blockingErrors,
        licenseState: sanitizeLicenseState(status.licenseState),
      });
    }

    if (req.method === "GET" && pathname === "/runtime-config.json") {
      const runtimeConfig = await readJsonFile(RUNTIME_CONFIG_PATH);
      if (!runtimeConfig || !runtimeConfig.initialized) {
        return sendJson(res, 404, { error: "Runtime config belum diinisialisasi." });
      }
      return sendJson(res, 200, getPublicRuntimeConfig(runtimeConfig));
    }

    if (req.method === "POST" && pathname === "/setup/license/validate") {
      const body = await parseRequestBody(req);
      const result = await performLicenseValidation(body);
      return sendJson(res, result.valid ? 200 : 422, {
        valid: result.valid,
        status: result.status,
        licensedHost: result.licensedHost,
        warnings: result.warnings,
        blockingErrors: result.blockingErrors,
      });
    }

    if (req.method === "POST" && pathname === "/setup/validate") {
      const body = await parseRequestBody(req);
      const result = await validateSetupPayload(body);
      return sendJson(res, result.blockingErrors.length > 0 ? 422 : 200, result);
    }

    if (req.method === "POST" && pathname === "/setup/init") {
      const body = await parseRequestBody(req);
      const [licenseResult, setupResult] = await Promise.all([
        performLicenseValidation(body),
        validateSetupPayload(body),
      ]);

      const blockingErrors = [
        ...licenseResult.blockingErrors,
        ...setupResult.blockingErrors,
      ];

      if (blockingErrors.length > 0) {
        return sendJson(res, 422, {
          error: "Setup validation failed.",
          warnings: [...licenseResult.warnings, ...setupResult.warnings],
          blockingErrors,
        });
      }

      const runtimeConfig = buildRuntimeConfig(body);
      const now = new Date().toISOString();
      const licenseState = {
        licenseKey: body.licenseKey,
        licenseKeyMasked: maskLicenseKey(body.licenseKey),
        licenseStatus: licenseResult.status,
        licensedHost: licenseResult.licensedHost,
        activatedAt: now,
        expiresAt: licenseResult.expiresAt,
        lastValidationAt: now,
      };

      await writeJsonFile(RUNTIME_CONFIG_PATH, runtimeConfig);
      await writeJsonFile(LICENSE_STATE_PATH, licenseState);

      return sendJson(res, 200, {
        setupStatus: {
          initialized: true,
          configValid: true,
          licenseValid: true,
          serverPermissionValid: true,
          needsSetup: false,
          warnings: [...licenseResult.warnings, ...setupResult.warnings],
          blockingErrors: [],
        },
        runtimeConfig: getPublicRuntimeConfig(runtimeConfig),
        licenseState: sanitizeLicenseState(licenseState),
      });
    }

    if (pathname === "/admin/runtime-config") {
      if (!requireAdmin(req, res)) return;
      if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
      const body = await parseRequestBody(req);
      const validation = await validateSetupPayload(body);
      if (validation.blockingErrors.length > 0) {
        return sendJson(res, 422, {
          error: "Runtime config invalid.",
          ...validation,
        });
      }

      const existing = (await readJsonFile(RUNTIME_CONFIG_PATH)) || {};
      const nextConfig = {
        ...buildRuntimeConfig(body),
        initialized: existing.initialized !== false,
      };
      await writeJsonFile(RUNTIME_CONFIG_PATH, nextConfig);
      return sendJson(res, 200, {
        runtimeConfig: getPublicRuntimeConfig(nextConfig),
        setupStatus: {
          initialized: true,
          configValid: true,
          licenseValid: true,
          serverPermissionValid: true,
          needsSetup: false,
          warnings: validation.warnings,
          blockingErrors: [],
        },
      });
    }

    if (pathname === "/admin/license-status") {
      if (!requireAdmin(req, res)) return;
      const licenseState = await readJsonFile(LICENSE_STATE_PATH);
      if (!licenseState) return sendJson(res, 404, { error: "License state not found." });
      return sendJson(res, 200, sanitizeLicenseState(licenseState));
    }

    if (pathname === "/admin/license/revalidate") {
      if (!requireAdmin(req, res)) return;
      if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
      const runtimeConfig = await readJsonFile(RUNTIME_CONFIG_PATH);
      const licenseState = await readJsonFile(LICENSE_STATE_PATH);
      if (!runtimeConfig || !licenseState?.licenseKey) {
        return sendJson(res, 404, { error: "Runtime config or license state not found." });
      }
      const result = await performLicenseValidation({
        licenseKey: licenseState.licenseKey,
        publicAppUrl: runtimeConfig.publicAppUrl,
      });
      if (!result.valid) {
        return sendJson(res, 422, {
          error: "License revalidation failed.",
          warnings: result.warnings,
          blockingErrors: result.blockingErrors,
        });
      }
      const nextState = {
        ...licenseState,
        licenseStatus: result.status,
        licensedHost: result.licensedHost,
        expiresAt: result.expiresAt,
        lastValidationAt: new Date().toISOString(),
      };
      await writeJsonFile(LICENSE_STATE_PATH, nextState);
      return sendJson(res, 200, {
        licenseState: sanitizeLicenseState(nextState),
        warnings: result.warnings,
        blockingErrors: [],
      });
    }

    if (pathname === "/admin/connection-pool/inspect") {
      if (!requireAdmin(req, res)) return;
      if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
      const body = await parseRequestBody(req);
      const result = await inspectConnectionPoolTargets(body);
      return sendJson(res, result.ok ? 200 : 422, result);
    }

    if (pathname === "/adapter-runtime/check-source") {
      if (!requireAuthenticated(req, res)) return;
      if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
      const body = await parseRequestBody(req);
      const baseUrl = String(body.baseUrl || "").trim();
      if (!isValidHttpUrl(baseUrl)) {
        return sendJson(res, 422, { ok: false, error: "Base URL tidak valid." });
      }

      try {
        let response = await fetchWithTimeout(baseUrl, { method: "HEAD" }, 5000);
        if (!response.ok || response.status === 405) {
          response = await fetchWithTimeout(baseUrl, { method: "GET" }, 5000);
        }
        return sendJson(res, response.ok ? 200 : 422, {
          ok: response.ok,
          httpStatus: response.status,
          message: response.ok
            ? "Alamat sumber merespons dari sisi wrapper."
            : `Alamat sumber merespons dengan HTTP ${response.status}.`,
        });
      } catch (error) {
        return sendJson(res, 422, {
          ok: false,
          error: error instanceof Error ? error.message : "Remote source check failed.",
        });
      }
    }

    if (pathname.startsWith("/adapter-runtime/")) {
      const adapterBaseUrl = normalizeBaseUrl(req.headers["x-adapter-base-url"]);
      if (!isValidHttpUrl(adapterBaseUrl)) {
        return sendJson(res, 422, { error: "Adapter base URL belum valid atau belum dipilih." });
      }

      const targetPath = pathname.replace(/^\/adapter-runtime/, "") || "/";
      const targetUrl = `${adapterBaseUrl}${targetPath}${url.search}`;
      return proxyRequest(req, res, targetUrl);
    }

    // OGC adapter only supports GET on /ogc/collections/*/items; connector BE calls
    // documentation_url with POST. Intercept here and force GET before proxying.
    if (
      pathname.startsWith("/adapter-service/") &&
      /\/ogc\/collections\/[^/]+\/items/.test(pathname)
    ) {
      const runtimeConfig = await readJsonFile(RUNTIME_CONFIG_PATH);
      const adapterEndpoint = normalizeBaseUrl(runtimeConfig?.adapterEndpoint);
      if (!isValidHttpUrl(adapterEndpoint)) {
        return sendJson(res, 503, { error: "Adapter service belum dikonfigurasi di runtime wrapper." });
      }
      const targetPath = pathname.replace(/^\/adapter-service/, "") || "/";
      const targetUrl = `${adapterEndpoint}${targetPath}${url.search}`;
      const fwdHeaders = { ...req.headers };
      delete fwdHeaders.host;
      delete fwdHeaders["content-length"];
      delete fwdHeaders["content-type"];
      const ogcResponse = await fetch(targetUrl, { method: "GET", headers: fwdHeaders, redirect: "manual" });
      const ogcHeaders = {};
      ogcResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === "transfer-encoding") return;
        ogcHeaders[key] = value;
      });
      res.writeHead(ogcResponse.status, ogcHeaders);
      return res.end(Buffer.from(await ogcResponse.arrayBuffer()));
    }

    if (pathname.startsWith("/adapter-service/")) {
      const runtimeConfig = await readJsonFile(RUNTIME_CONFIG_PATH);
      const adapterEndpoint = normalizeBaseUrl(runtimeConfig?.adapterEndpoint);
      if (!isValidHttpUrl(adapterEndpoint)) {
        return sendJson(res, 503, { error: "Adapter service belum dikonfigurasi di runtime wrapper." });
      }

      const targetPath = pathname.replace(/^\/adapter-service/, "") || "/";
      const targetUrl = `${adapterEndpoint}${targetPath}${url.search}`;
      return proxyRequest(req, res, targetUrl);
    }

    if (pathname.startsWith("/api/") || pathname === "/openapi.json" || pathname.startsWith("/docs")) {
      const runtimeConfig = await readJsonFile(RUNTIME_CONFIG_PATH);
      if (!runtimeConfig?.apiBaseUrl) {
        return sendJson(res, 503, { error: "Runtime API base URL belum dikonfigurasi." });
      }

      const apiBaseUrl = normalizeBaseUrl(runtimeConfig.apiBaseUrl);
      const apiRoot = apiBaseUrl.replace(/\/api\/v\d+\/?$/, "");
      const targetUrl =
        pathname.startsWith("/api/")
          ? `${apiRoot}${pathname}${url.search}`
          : `${apiRoot}${pathname}${url.search}`;
      return proxyRequest(req, res, targetUrl);
    }

    let filePath = path.join(DIST_DIR, pathname === "/" ? "index.html" : pathname.slice(1));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveStaticFile(res, filePath);
    }

    filePath = path.join(DIST_DIR, "index.html");
    if (!fs.existsSync(filePath)) {
      return sendText(res, 503, "dist/index.html belum tersedia. Jalankan npm run build terlebih dahulu.");
    }
    return serveStaticFile(res, filePath);
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unknown bootstrap error",
    });
  }
});

server.listen(PORT, HOST, async () => {
  await ensureConfigDir();
  console.log(`[rapidsk-bootstrap] listening on http://${HOST}:${PORT}`);
  console.log(`[rapidsk-bootstrap] dist dir: ${DIST_DIR}`);
  console.log(`[rapidsk-bootstrap] config dir: ${CONFIG_DIR}`);
});
