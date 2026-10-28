FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG MYT_BACKEND_URL=http://localhost:8080
ENV MYT_BACKEND_URL=${MYT_BACKEND_URL}
RUN npm run build && node scripts/delete-source-maps.mjs

FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser/ /usr/share/nginx/html/
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
