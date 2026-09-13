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

Managed as a Git-backed [Coolify Application: bjj / production / mat-log](https://coolify.vmoon.tech/project/whbor1e1vtyhc3scyxppzoen/environment/eweqghafzlevkffaye7hfvum/application/rby1xekmtkpsodhfchzwr9zz), on `crecenly-apps` (`179.197.70.53`, listed as `localhost` in Coolify).

Coolify reads root `docker-compose.yml` from `vlunaklick/mat-log`, branch `main`. It builds `web` with `deploy/web.Dockerfile` and `api` with `server/Dockerfile`, and runs PostgreSQL 18 as `db`. The web container serves `https://bjj.vmoon.tech` and host loopback port 8090.

Pushes to `main` trigger Coolify through a signed GitHub webhook. **Deployments** shows commit history, build logs, and deployment status. Use **Deploy** in the Application to redeploy the latest main manually. Preview deployments are disabled because this stack contains the production database and a fixed host port.

Manage secrets in the Application's **Environment Variables**; the template is `deploy/.env.example`. They are runtime variables and are excluded from Docker build contexts. The old GitHub Actions/SSH deployment scripts are retired.

## Backup and migration

Settings → Export downloads a JSON of your sessions, techniques and settings. Import restores it. Production PostgreSQL uses Docker volume `rby1xekmtkpsodhfchzwr9zz_bjj-pg-data`, mounted at `/var/lib/postgresql`.

For a fresh database backup, find the current database container by its Compose labels:

```bash
ssh crecenly-apps 'set -eu
  umask 077
  db=$(docker ps -q --filter label=com.docker.compose.project=rby1xekmtkpsodhfchzwr9zz --filter label=com.docker.compose.service=db)
  test -n "$db"
  docker exec "$db" pg_dump -U postgres -d matlog -Fc > /opt/bjj/backups/matlog-$(date +%Y%m%d-%H%M%S).dump
'
```

The September 13, 2026 Application migration copies the stopped Service database into the Application volume. Backups and the former deployment command are retained in `/opt/bjj/backups/pre-application-20260913/`, accessible only to root. The previous Service `peohorsmczbc4vvmhczqtxz7` is retained stopped for rollback, with its original volume `peohorsmczbc4vvmhczqtxz7_bjj-pg-data` and files in `/data/coolify/services/peohorsmczbc4vvmhczqtxz7/`.

To roll back, disable this Application's auto-deploy and stop it first. If any writes occurred after migration, back up the current database and transfer it into the old Service database before restarting the old API/web containers. Restore the Service domain to `https://bjj.vmoon.tech` if necessary, then use the old Service's **Deploy** action. Never start both stacks on port 8090 or run two PostgreSQL instances against one volume. Do not delete volumes during deployment or rollback.

An even older pre-Coolify stack remains stopped under `/opt/bjj`, with volume `bjj_bjj_pg_data` and backups in `/opt/bjj/backups/pre-coolify/`. Its data predates both migrations.
