# Automatic deployment Implementation Plan

> Execute inline in this session. Review before provisioning and verify against production.

**Goal:** Deploy main automatically while preserving the current Coolify service and database.

**Architecture:** GitHub Actions invokes a forced SSH command. The VPS fetches public main, builds in Node 24 Docker, copies build inputs into the existing service, and calls Coolify. Serialize deployments and verify container health and HTTPS before success.

**Tech Stack:** GitHub Actions, SSH, Docker, Coolify, nginx.

- [ ] Add `.github/workflows/deploy.yml` and `deploy/deploy-main.sh`, with a restricted SSH key stored in GitHub secrets and host key verified over existing SSH.
- [ ] Check scripts, build, provision server command, commit deployment files and push main; verify actual Actions run and healthy containers.
- [ ] Diagnose browser security state with HTTPS checks and Chrome. Fix only reproduced causes, preserving certificate validation.
- [ ] Update README with automatic deployment and recovery instructions.
