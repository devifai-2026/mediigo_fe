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
// Server-side only: no VITE_ prefix, so it is never inlined into the bundle.
const API_TARGET = process.env.API_PROXY_TARGET;

if (!API_TARGET) {
  console.error('\nAPI_PROXY_TARGET is required (e.g. https://mediigo-be.onrender.com)\n');
  process.exit(1);
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

const server = app.listen(PORT, () => {
  console.log(`Mediigo client on :${PORT} — proxying /api to ${API_TARGET}`);
});

// Without this, socket.io's HTTP->WebSocket upgrade never reaches the proxy.
server.on('upgrade', proxy.upgrade);
