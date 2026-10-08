# Fabrixly Cam Sharing — web app (React + Vite) served by nginx.
# Built FROM SOURCE (no pre-built dist/ needed), so Jenkins can clone -> build -> push -> deploy:
#     docker build -t kumaravinit/zero:camshare-web-1.0.0 .
# The Android/desktop installers are built on a developer machine (build_all.sh) and are NOT part of this image: put them in
# the `camshare_downloads` volume (see docker-compose.prod.yml) and they are served under /downloads/.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: skip the Electron / Capacitor native post-install downloads, the web build does not need them
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
