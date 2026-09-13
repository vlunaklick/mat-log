# Coolify Application migration Implementation Plan

> Execute inline in this session. Review the plan before provisioning and verify production before retiring the old deployment path.

**Goal:** Manage Mat Log as a Git-backed Coolify Application with deployment history and automatic deployments on main.

**Architecture:** Build web and API images from the repository using Docker Compose. Create an Application in the existing bjj production environment and copy the stopped PostgreSQL 18 volume into its Coolify-managed volume. Keep the old Service stopped, with its files and original volume available for rollback. Use a signed GitHub push webhook, as Moony does.

**Tech Stack:** Coolify 4.3.17, GitHub webhooks, Docker Compose, nginx, Node 24, PostgreSQL 18.

### Task 1: Prepare repository deployment

- [x] Create `deploy/web.Dockerfile` with Node build and nginx runtime; add `.dockerignore` to exclude secrets, Git, and local dependencies.
- [x] Move `deploy/docker-compose.yml` to root `docker-compose.yml` with repository build contexts, retaining health checks, loopback port 8090, and isolated internal network.
- [x] Remove `.github/workflows/deploy.yml`, `deploy.sh`, `deploy/deploy-main.sh`, and `deploy/coolify-deploy.php` after preserving their deployed copies for rollback.
- [x] Validate Compose and build both images on the VPS, without starting a second production database.

### Task 2: Provision and migrate

- [x] Back up the current service configuration, Coolify database, and Mat Log database under a root-only directory in `/opt/bjj/backups/`.
- [x] Disable the old Actions workflow and restricted SSH deploy entrypoint before publishing changes. Confirm no old deployment is running.
- [x] Create the Application, copy existing secret values inside the VPS, disable previews, and configure the repository, Compose path, and web domain.
- [x] Inspect Coolify's rendered Compose to confirm volume name, build paths, port, and network configuration.
- [x] Stop web and API to freeze writes, dump the database and record counts of every public table, then stop PostgreSQL. Copy the cold volume into the new empty managed volume. Never run both database containers against one volume.
- [x] Deploy through Coolify's normal application queue. If it fails, stop the new stack before restarting the preserved old containers. If writes occurred after cutover, transfer current database contents before rollback.
- [x] Check HTTPS health, static assets, all container health states, mounted volume, preserved secret equality, and exact table counts.

### Task 3: Finish automation and documentation

- [x] Add the signed GitHub push webhook and enable automatic deployments. Push a documentation commit and verify a webhook-triggered deployment reaches `finished` in Coolify.
- [x] Update `README.md` with the Application link, deployment flow, backup command, and rollback steps using the new volume.
- [x] Retire the old SSH key authorization and GitHub Actions secrets after verification. Keep the old Service clearly named as stopped rollback infrastructure.
- [x] Fast-forward the user's original checkout without overwriting unrelated local changes and report the verified deployment link.


## Verified result

- Application `rby1xekmtkpsodhfchzwr9zz`, ID 29, in the existing bjj production environment.
- Manual deployment `ldoy06xvpkfykuyukwdae9ac` finished for `8617576`.
- Real GitHub push triggered deployment `ktr4wbf5ijknvofcbx5rsln2` for `b5e39c3`; it finished successfully and appears as Webhook / Success in the dashboard.
- Signed push webhook ID `678734554`; automatic deployments enabled, previews disabled.
- All three containers healthy, HTTPS and loopback health checks passed, and built JavaScript/CSS served HTTP 200.
- Counts across all 12 public tables match before and after migration. Existing auth and API secrets compare equal. Browser session remained authenticated and all 12 saved techniques were visible.
- Active volume `rby1xekmtkpsodhfchzwr9zz_bjj-pg-data`; former volume retained with stopped containers and restart disabled.
- Former Service renamed `mat-log-rollback-20260913`; its domain assignments cleared to avoid duplicate configuration. Restore its web domain before using it for rollback.
- Root-only backups in `/opt/bjj/backups/pre-application-20260913/`, including the final pre-cutover database dump, Coolify dump, original config, and table-count evidence.
- Legacy workflow removed, dedicated SSH authorization revoked, and both GitHub Actions deployment secrets removed.
- Original checkout fast-forwarded without overwriting concurrent UI work. The later UI commit `8fb1de3` was independently received by the webhook.
