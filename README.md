# mediigo_fe

Mediigo frontend — React + Vite SPA, served in production by `server.js`.

`server.js` is a small Express host rather than a Render Static Site on purpose:
it proxies `/api` and `/socket.io` to the backend so the browser only ever talks
to this origin. That keeps the httpOnly refresh cookie first-party, exactly as
the Vite dev proxy does locally — no `SameSite=None`, no CORS exemption, no
backend change.

## Local development

```bash
npm install
npm run dev
```

`VITE_API_URL` stays empty in dev so axios uses the Vite proxy. See
`.env.example` for the full list.

## Keeping the services warm (free tier)

Render's free tier spins a service down after **~15 minutes without inbound
traffic**. The cold start that follows takes **20-50 seconds** — long enough
that the browser abandons the request and Render's edge serves its own 502 page
before our proxy timeout fires. To a visitor that looks like an outage, not a
slow load.

It takes **two pieces** to prevent this, because a service cannot keep *itself*
awake: an internal call generates no inbound traffic, and the timer dies with
the process it lives in.

### 1. Backend — handled automatically

`server.js` pings `${API_PROXY_TARGET}/healthz` every 10 minutes. That is a real
inbound request to the backend, so it resets the backend's idle timer. No setup
needed; it starts with the service.

`/healthz` is the deliberate target — it is exempt from the backend's rate
limiter and never touches the database, so the ping costs one cheap round-trip
and can never eat a real user's request budget.

| Variable | Default | Purpose |
| --- | --- | --- |
| `KEEPALIVE_ENABLED` | `true` | Set to `false` to turn the ping off (e.g. on a paid instance, where it is pointless). |
| `KEEPALIVE_INTERVAL_MS` | `600000` (10 min) | Ping interval. Must stay comfortably under Render's ~15 min idle window. |

It logs only when something is worth reading: a non-OK status, an unreachable
backend, or a response slower than 5s (which means it just caught a cold start).
A healthy ping is silent, so this does not write a log line every 10 minutes
forever.

### 2. Frontend — needs an external monitor

**This is the manual step.** Nothing inside this service can keep it awake, so
point a free external monitor at:

```
https://mediigo-fe.onrender.com/healthz
```

Use [UptimeRobot](https://uptimerobot.com) or
[cron-job.org](https://cron-job.org) (both free), interval **10 minutes**.
`/healthz` is declared before the proxy and the SPA fallback, and is DB-free, so
it answers instantly and a backend outage can never make the frontend look
unhealthy.

Without this step the frontend still sleeps — and when it does, its keepalive
timer sleeps with it and the backend goes cold too.

### Upgrading later

On a paid instance neither piece is needed: set `KEEPALIVE_ENABLED=false` and
delete the external monitor.

## Deployment

`render.yaml` describes the service. Health check path is `/healthz`, which is
DB-free and declared before the proxy, so a backend outage never marks the
frontend itself unhealthy.
