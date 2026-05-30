#!/bin/sh
set -eu
: "${API_BASE_URL:=}"
: "${API_GATEWAY_URL:=http://api-gateway:8080}"
envsubst '${API_BASE_URL}' < /usr/share/nginx/html/env.template.js > /usr/share/nginx/html/env.js
envsubst '${API_GATEWAY_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
