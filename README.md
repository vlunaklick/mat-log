# Mat Log

A mobile-first, offline-capable BJJ training journal. Everything is stored on your device (IndexedDB). No accounts, no server.

## Features

- **Journal**: log every class in under two minutes. Techniques drilled, each roll (partner belt, outcome, where you got stuck), what worked, what failed, and the one thing to fix next class.
- **Techniques**: your own notes per technique, grouped by position. Flashcard review with spaced repetition so details stick between classes.
- **Progress**: mat hours, weekly streak, weekly chart against your goal, the positions you get stuck in most, roll outcomes by belt, most drilled techniques.
- **Coach**: chat with an AI coach that reads your last 30 days of logs and gives one concrete focus at a time. Needs your own Anthropic API key (Settings).

## Run

```bash
npm install
npm run dev
```

Open the URL on your phone (same Wi-Fi: `npm run dev -- --host`) and "Add to Home Screen" to install it as an app.

## Build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).

## Backup

Settings → Export backup downloads a JSON file. Import restores it. The API key is never included in backups.

## Deploy

`./deploy.sh` builds, rsyncs `dist/` to the apps VPS (`/opt/bjj`) and starts the nginx container that Traefik (Coolify's proxy) routes for `bjj.vmoon.tech`. The compose file and nginx config live on the VPS in `/opt/bjj`.
