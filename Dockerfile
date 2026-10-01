FROM docker.darvagcloud.com/library/node:22-alpine AS builder

RUN ALPINE_VERSION=$(cat /etc/alpine-release | cut -d. -f1,2) && \
    echo "https://mirror.darvagcloud.com/alpine/v$ALPINE_VERSION/main" > /etc/apk/repositories && \
    echo "https://mirror.darvagcloud.com/alpine/v$ALPINE_VERSION/community" >> /etc/apk/repositories

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund --registry=https://package-mirror.liara.ir/repository/npm/

COPY . .
# آدرس API و gateway نسبی است (/api و /v1 روی همین دامنه با HTTPRoute به بک‌اند لاراول می‌روند)،
# پس چیزی در زمان build داخل bundle نمی‌نشیند.
RUN npx quasar prepare && npx quasar build


FROM docker.darvagcloud.com/library/nginx:stable-alpine

RUN ALPINE_VERSION=$(cat /etc/alpine-release | cut -d. -f1,2) && \
    echo "https://mirror.darvagcloud.com/alpine/v$ALPINE_VERSION/main" > /etc/apk/repositories && \
    echo "https://mirror.darvagcloud.com/alpine/v$ALPINE_VERSION/community" >> /etc/apk/repositories

COPY --from=builder /app/dist/spa /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
