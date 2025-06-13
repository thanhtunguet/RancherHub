#!/bin/sh
set -e

# Default backend URL if not provided
BACKEND_URL=${BACKEND_URL:-http://localhost:3000}

# Replace environment variables in nginx config
envsubst '${BACKEND_URL}' < /etc/nginx/nginx.conf > /tmp/nginx.conf
mv /tmp/nginx.conf /etc/nginx/nginx.conf

# Replace API URL in the built JavaScript files
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|http://localhost:3000|${BACKEND_URL}|g" {} \;

# Execute the command
exec "$@"