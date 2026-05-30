FROM node:20-alpine AS build
WORKDIR /app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

COPY package.json .npmrc ./
RUN npm install --no-package-lock --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache gettext
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
COPY public/env.template.js /usr/share/nginx/html/env.template.js
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENV API_BASE_URL="" \
    API_GATEWAY_URL="http://api-gateway:8080"
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
