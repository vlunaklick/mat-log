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

Managed in [Coolify: bjj / production / mat-log](https://coolify.vmoon.tech/project/whbor1e1vtyhc3scyxppzoen/environment/eweqghafzlevkffaye7hfvum/service/peohorsmczbc4vvmhczqtxz7), on `crecenly-apps` (`179.197.70.53`, listed as `localhost` in Coolify).

The service contains `web` (nginx), `api` (Node), and `db` (PostgreSQL 18). Coolify manages their lifecycle, logs, environment variables, storage, and HTTPS for `bjj.vmoon.tech`. The web service also listens on host loopback port 8090.

Every push to `main` triggers the **Deploy production** GitHub Actions workflow. It uses a dedicated SSH key restricted to `/usr/local/sbin/mat-log-deploy` on the VPS. That command fetches `origin/main`, builds in Node 24 Docker, and deploys through the existing Coolify service. Runs are serialized and succeed only after replacement containers are healthy and the public HTTPS health check passes. When pushes overlap, the latest main is deployed. Secrets `VPS_DEPLOY_KEY` and `VPS_KNOWN_HOSTS` live in GitHub Actions. The last successful revision is recorded at `/data/coolify/services/peohorsmczbc4vvmhczqtxz7/deployed-revision`.

The server entrypoint is maintained in `deploy/deploy-main.sh`; after editing it, install it with `scp deploy/deploy-main.sh crecenly-apps:/usr/local/sbin/mat-log-deploy`.

For manual local deployment, `./deploy.sh` builds the frontend, uploads sources and static assets to `/data/coolify/services/peohorsmczbc4vvmhczqtxz7`, updates the Compose definition, and starts deployment through Coolify. It uses the existing administrator SSH connection and Coolify's installed PHP application. Check completion in the panel. The PHP helper depends on Coolify's internal API and may need adjustment after a Coolify upgrade.

To redeploy the uploaded code or apply environment changes, use **Actions > Deploy** in Coolify. Edit secrets in **Environment Variables**; the template is `deploy/.env.example`. Do not overwrite the generated `.env` or run the old `/opt/bjj/docker-compose.yml`.

## Backup and migration

Settings → Export downloads a JSON of your sessions, techniques and settings. Import restores it. Production PostgreSQL uses Docker volume `peohorsmczbc4vvmhczqtxz7_bjj-pg-data`, mounted at `/var/lib/postgresql`.

The September 13, 2026 migration preserved the original volume `bjj_bjj_pg_data` and stopped the old `bjj-web`, `bjj-api`, and `bjj-db` containers with automatic restart disabled. The old configuration and database dumps remain in `/opt/bjj/backups/pre-coolify/`. Treat these as sensitive files.

For a fresh database backup:

```bash
ssh crecenly-apps 'umask 077; docker exec db-peohorsmczbc4vvmhczqtxz7 pg_dump -U postgres -d matlog -Fc > /opt/bjj/backups/matlog-$(date +%Y%m%d-%H%M%S).dump'
```

For rollback, first stop the managed service in Coolify. The original `/opt/bjj/docker-compose.yml` can then start the previous stack with `docker compose up -d` from that directory. Its volume contains the data at migration time: if users have written new data since migration, back up and transfer the current database before rolling back. Never run both stacks together, and never remove a database volume as part of redeployment.
