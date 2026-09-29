// Production host for the built SPA on Render.
//
// This exists instead of a static site for one reason: it proxies /api and
// /socket.io to the backend, so the browser only ever talks to THIS origin.
// That keeps the httpOnly refresh cookie first-party, exactly as the Vite dev
// proxy does locally — no SameSite=None, no CORS exemption, no backend change.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, 'dist');

const PORT = process.env.PORT || 4173;

// The deployed backend. Only ever read server-side — no VITE_ prefix, so it is
// never inlined into the browser bundle.
const DEFAULT_API_TARGET = 'https://darkslategrey-penguin-138082.hostingersite.com';
const API_TARGET = process.env.API_PROXY_TARGET || DEFAULT_API_TARGET;

if (!process.env.API_PROXY_TARGET) {
  // Not fatal: the default is correct for the standard deploy, and a frontend
  // that cannot reach its API is more useful up (serving the SPA) than dead.
  console.warn(`API_PROXY_TARGET not set — defaulting to ${DEFAULT_API_TARGET}`);
}

const app = express();
app.disable('x-powered-by');

// Liveness for Render's health check. Declared before the proxy and the SPA
// fallback so it can never be swallowed by either.
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, status: 'alive', uptime: Math.round(process.uptime()) });
});

const proxy = createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  // app.use('/api', ...) strips the mount path before the proxy sees the
  // request, so put it back — the backend mounts its routes under /api.
  pathRewrite: (p, req) => (req.baseUrl ? req.baseUrl + p : p),
  ws: true, // socket.io upgrades from polling to websocket
  xfwd: true,
  // The backend sets its refresh cookie for its own host. Stripping Domain
  // lets the browser scope it to this origin instead, which is what makes the
  // first-party cookie work through the proxy.
  cookieDomainRewrite: '',
  proxyTimeout: 30000,
  on: {
    // The browser's request to US is same-origin, but it still sends an Origin
    // header, and forwarding it makes the backend evaluate its CORS allowlist
    // against a request that was never cross-origin. Drop it so this reaches
    // the backend as the plain server-to-server call it actually is.
    proxyReq: (proxyReq) => {
      proxyReq.removeHeader('origin');
      proxyReq.removeHeader('referer');
    },
    error: (err, _req, res) => {
      console.error(`proxy error: ${err.message}`);
      if (res.writeHead && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
      }
      res.end?.(JSON.stringify({ error: { code: 'BAD_GATEWAY', message: 'Upstream API unreachable' } }));
    },
  },
});

app.use('/api', proxy);
app.use('/socket.io', proxy);

// Hashed asset filenames are immutable; index.html must never be cached or
// clients keep booting an old bundle that points at deleted chunks.
app.use(
  express.static(dist, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
      else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);

// SPA fallback: every non-asset path returns index.html so a hard reload or a
// pasted deep link (/super/staff, /d/queue, /display/:serialId) boots the app
// and lets react-router resolve the route client-side.
app.get('*', (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

/**
 * Keep the backend warm.
 *
 * Render's free tier spins a service down after ~15 minutes without INBOUND
 * traffic, and the cold start that follows takes 20-50s — long enough that the
 * browser abandons the request and Render's edge serves its own 502 page before
 * our proxy timeout ever fires. A visitor's first click after an idle period
 * therefore looks like an outage rather than a slow load.
 *
 * This ping is a real inbound HTTP request to the BACKEND, so it resets that
 * idle timer. Note it can only ever keep the OTHER service warm: a process
 * cannot ping itself awake, because an internal call generates no inbound
 * traffic and the timer dies with the process it lives in. Keeping THIS service
 * warm needs an external monitor hitting /healthz — see README.
 *
 * /healthz is the right target: it deliberately does not touch the database, so
 * this costs one cheap round-trip.
 *
 * The backend now lives on Hostinger rather than Render's free tier, so it does
 * not spin down and this ping is mostly redundant for it. Kept because it is
 * harmless, and because it surfaces an unreachable backend in the frontend's
 * own logs rather than only when a user hits it. Set KEEPALIVE_ENABLED=false to
 * turn it off.
 */
const KEEPALIVE_MS = Number(process.env.KEEPALIVE_INTERVAL_MS || 10 * 60 * 1000);
// Opt-out rather than opt-in: the default deploy is free-tier and wants this.
const KEEPALIVE_ENABLED = process.env.KEEPALIVE_ENABLED !== 'false';

const pingBackend = async () => {
  const url = `${API_TARGET.replace(/\/$/, '')}/healthz`;
  const startedAt = Date.now();
  try {
    // Abort well short of the interval so a hung socket can never stack pings.
    const res = await fetch(url, {
      signal: AbortSignal.timeout(60_000),
      headers: { 'user-agent': 'mediigo-fe-keepalive' },
    });
    const ms = Date.now() - startedAt;
    // Only worth a line when it was slow enough to have been a cold start —
    // otherwise this would write a log entry every ten minutes forever.
    if (!res.ok) console.warn(`keepalive: backend returned ${res.status} in ${ms}ms`);
    else if (ms > 5000) console.log(`keepalive: backend woke in ${ms}ms (was likely asleep)`);
  } catch (err) {
    console.warn(`keepalive: backend unreachable after ${Date.now() - startedAt}ms — ${err.message}`);
  }
};

const server = app.listen(PORT, () => {
  console.log(`Mediigo client on :${PORT} — proxying /api to ${API_TARGET}`);

  if (!KEEPALIVE_ENABLED) {
    console.log('keepalive: disabled via KEEPALIVE_ENABLED=false');
    return;
  }
  console.log(`keepalive: pinging ${API_TARGET}/healthz every ${Math.round(KEEPALIVE_MS / 60000)} min`);
  // unref() so this timer never holds the process open during a shutdown.
  setInterval(pingBackend, KEEPALIVE_MS).unref();
  // One immediate ping: a fresh deploy usually means the backend is cold too,
  // and waking it now beats making the first real visitor wait for it.
  pingBackend();
});

// Without this, socket.io's HTTP->WebSocket upgrade never reaches the proxy.
server.on('upgrade', proxy.upgrade);
