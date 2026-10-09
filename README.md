# Fabrixly Cam Sharing

Zero-network file sharing via visual QR codes. Securely transfer files across air-gapped devices at lightning speed: no Wi-Fi, no Bluetooth, no cables. Data moves visually, from one device's screen to another device's camera.

**Live:** https://cam-share.fabrixly.com

## Features

- **100% offline**: transfers are strictly visual, via your camera and screen.
- **Cross-platform**: Web, Android, macOS, Windows and Linux.
- **Fountain protocol**: erasure coding keeps the transfer flawless even when camera frames are dropped.
- **Hardware-accelerated processing**: high-speed chunk rendering and background web-worker decoding.

## Tech stack

React 19 + TypeScript + Vite (Tailwind CSS 4) for the web app, Capacitor for Android/iOS, Electron for the desktop apps, nginx for hosting.

```
src/            React app (components, workers)
public/         static assets (public/downloads is generated and git-ignored)
android/ ios/   Capacitor native projects
electron/       Electron main/preload for the desktop apps
Dockerfile      builds the web app from source and serves it with nginx
nginx.conf      SPA routing, /healthz, /downloads, security headers
docker-compose.prod.yml   production deploy behind Traefik (used by Jenkins)
docker-compose.yml        local demo stack (its own Traefik on :80)
```

## Development

```bash
npm install
npm run dev        # http://localhost:5173 with hot reload
npm run lint
```

## Building the native apps

Prerequisites: Node.js 18+, Java JDK 21 and the Android SDK (Android), a macOS/Linux/Windows machine for the matching Electron builds.

```bash
chmod +x build_all.sh
./build_all.sh
```

`build_all.sh` installs dependencies, builds the Android APK with Gradle, builds the Electron desktop apps with `electron-builder`, harvests the binaries into `public/downloads/` with `copy-builds.js`, and bundles the web app into `dist/`.
The installers are **not** committed to git and are **not** part of the Docker image; see "Serving the installers" below.

## Docker

The image is built **from source** (no pre-built `dist/` needed):

```bash
docker build -t cam-sharing .
docker run --rm -p 8080:80 cam-sharing     # http://localhost:8080
```

For a quick local stack with its own Traefik on port 80 use `docker compose up -d`.

## Production deployment (Jenkins + Traefik)

The site runs on the shared Fabrixly VPS and is deployed by the Jenkins job `zero-cam-sharing`:

1. clone this repository, 2. `docker build` the `Dockerfile`, 3. push `kumaravinit/zero:camshare-web-<version>` to Docker Hub, 4. copy `docker-compose.prod.yml` to the server and `docker compose pull && up -d`, 5. verify `https://cam-share.fabrixly.com/healthz`.

Traefik fronts the container and issues the Let's Encrypt certificate for `cam-share.fabrixly.com` (an A record to the server is required). The container runs read-only with all capabilities dropped except what nginx needs. The VPS only ever runs the **published** image.

To release a new version, bump the image tag in `docker-compose.prod.yml` and push to `main`.

### Installers

The Android/desktop installers are **release assets on GitHub** (tag `v<version>`, e.g. `v1.0.0`): `.dmg`/`.zip` for macOS (Apple Silicon and Intel), the `.exe` installer and a portable `.zip` for Windows, `.AppImage` and `.deb` for Linux, the `.apk` for Android, and `SHA256SUMS`. The download buttons on https://cam-share.fabrixly.com link straight to those assets, so the server stores no installers.

To publish a new version: bump `version` in `package.json` and `APP_VERSION` in `src/App.tsx`, run `./build_all.sh`, create the GitHub release `v<version>` with the files from the build, then push to `main` and run the Jenkins job.
(`docker-compose.prod.yml` still mounts an optional `/downloads/` volume, unused by the site, in case you ever want to self-host the files.)

## Security

- The repository is public: it contains **no credentials**. Android/iOS signing keys (`*.jks`, `*.keystore`, `*.p12`, provisioning profiles), `local.properties`, `.env*` and installers are git-ignored; keep them on your machine or in your CI secrets.
- The web app is static. It needs no runtime secrets, and camera access is limited to its own origin (`Permissions-Policy: camera=(self)`).

---

Designed with precision by **Zero-Cam**.
