# Mat Log

A BJJ training journal for one person. Log every class, keep technique notes with spaced-repetition review, watch progress, and ask an AI coach that has read your last 30 days.

Frontend: Vite + React 19 + TypeScript, Tailwind v4, shadcn (base-nova) with a monochrome pill design system (see `DESIGN.md`), installable as a PWA.
Backend: Hono on Node, Drizzle ORM on Postgres, Better Auth (email + password, sign-up closed), Gemini via the Vercel AI SDK. The Google key lives only on the server.

## Local development

```bash
# 1. Postgres
docker run -d --name matlog-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=matlog -p 5434:5432 postgres:18-alpine

# 2. API
cd server && cp .env.example .env   # fill GOOGLE_GENERATIVE_AI_API_KEY and a 32+ char BETTER_AUTH_SECRET
npm install && npm run db:migrate
EMAIL=you@example.com PASSWORD='choose-one' npm run create-user
npm run dev                          # http://localhost:3010

# 3. Web (proxies /api to the API)
cd .. && npm install && npm run dev  # http://localhost:5173
```

## Production

`./deploy.sh` builds the web bundle, rsyncs it plus the server sources to the apps VPS (`/opt/bjj`), builds the API image there and runs `docker compose up` with three containers: nginx (static + `/api` proxy), the API, and Postgres with a persistent volume. Traefik (Coolify's proxy) terminates TLS for `bjj.vmoon.tech`.

Secrets are only in `/opt/bjj/.env` on the VPS; the template is `deploy/.env.example`. To create the account in production run once on the VPS:

```bash
cd /opt/bjj && docker compose run --rm -e NODE_ENV=development -e EMAIL=you@example.com -e PASSWORD='choose-one' api npx tsx scripts/create-user.ts
```

## Backup

Settings → Export downloads a JSON of your sessions, techniques and settings. Import restores it. The Postgres volume `bjj_pg_data` is the real store; snapshot it from the VPS if you want a second copy.
