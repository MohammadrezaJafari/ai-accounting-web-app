FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY . .
# آدرس API و gateway نسبی است (/api و /v1 روی همین دامنه به بک‌اند لاراول route می‌شوند).
RUN npx quasar prepare && npx quasar build


FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/spa /usr/share/nginx/html

EXPOSE 8080
