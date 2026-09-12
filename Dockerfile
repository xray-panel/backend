FROM alpine:3.19 AS schema-patch
WORKDIR /opt/schemas
COPY assets/validator/xray.schema.json ./xray.schema.json
COPY assets/validator/xray.schema.cn.json ./xray.schema.cn.json

# Собранный фронтенд кладётся в контекст сборки перед сборкой образа.
# Правильное решение — собирать его здесь же многостадийно; это следующий шаг.

FROM alpine:3.19 AS frontend
WORKDIR /opt/frontend
COPY frontend-dist ./frontend-dist

ARG BRANCH=main
ARG FRONTEND_URL=https://github.com/kitten443/xpanel/frontend/releases/latest/download/remnawave-frontend.zip
ARG SINGBOX_SCHEMA_URL=https://github.com/BlackDuty/sing-box-schema/releases/download/v1.13.13/schema.json
ARG MIHOMO_SCHEMA_URL=https://github.com/dongchengjie/meta-json-schema/releases/download/v1.19.29/meta-json-schema.json

# Зеркало артефактов валидатора в собственном репозитории. Раньше они
# скачивались с validator.remna.dev без единой проверки, включая 59 МБ
# исполняемого кода. Теперь адреса наши и каждый файл сверяется по sha256.
ARG VALIDATOR_RELEASE=https://github.com/kitten443/xpanel/releases/download/validator-v1
ARG MAIN_WASM_SHA256=45b31aca38f8de5febdb4ef032f691e033d0b7139ba04bf792ef3a57b7c595cc
ARG WASM_EXEC_SHA256=0c949f4996f9a89698e4b5c586de32249c3b69b7baadb64d220073cc04acba14
ARG SINGBOX_SCHEMA_SHA256=a8e691ed3565f6ae02af19a992c0cb8d3c0e98e79e8e921819740d66f75ed9a8
ARG MIHOMO_SCHEMA_SHA256=04368aef934be14b5392e71ec4c33cd56999545918f462de1c1eee750815cc75

RUN apk add --no-cache curl unzip ca-certificates \
    && cp -a frontend-dist frontend_temp \
    && curl -fsSL ${VALIDATOR_RELEASE}/wasm_exec.js -o frontend_temp/dist/assets/wasm_exec.js \
    && echo "${WASM_EXEC_SHA256}  frontend_temp/dist/assets/wasm_exec.js" | sha256sum -c - \
    && curl -fsSL ${VALIDATOR_RELEASE}/main.wasm -o frontend_temp/dist/assets/main.wasm \
    && echo "${MAIN_WASM_SHA256}  frontend_temp/dist/assets/main.wasm" | sha256sum -c - \
    && curl -fsSL ${SINGBOX_SCHEMA_URL} -o frontend_temp/dist/assets/singbox.schema.json \
    && echo "${SINGBOX_SCHEMA_SHA256}  frontend_temp/dist/assets/singbox.schema.json" | sha256sum -c - \
    && curl -fsSL ${MIHOMO_SCHEMA_URL} -o frontend_temp/dist/assets/mihomo.schema.json \
    && echo "${MIHOMO_SCHEMA_SHA256}  frontend_temp/dist/assets/mihomo.schema.json" | sha256sum -c -

COPY --from=schema-patch /opt/schemas/xray.schema.json frontend_temp/dist/assets/xray.schema.json
COPY --from=schema-patch /opt/schemas/xray.schema.cn.json frontend_temp/dist/assets/xray.schema.cn.json

FROM node:24.20-trixie-slim AS backend-build
WORKDIR /opt/app

COPY package*.json ./
COPY patches ./patches
COPY prisma ./prisma
COPY rspack.config.mjs ./
COPY prisma.config.ts ./prisma.config.ts
COPY @types ./@types

# --ignore-scripts: postinstall собирает локальные контракты и патчит
# зависимости, но на этом шаге в образ ещё не скопированы ни scripts/, ни
# libs/, ни vendor/. Поэтому шаги выполняются явно ниже, после COPY.
RUN npm ci --prefer-offline --no-audit --no-fund --ignore-scripts

COPY tsconfig*.json ./
COPY src ./src
COPY libs ./libs
COPY vendor ./vendor
COPY scripts ./scripts

# Патчи зависимостей и сборка локальных контрактов — то, что обычно делает
# postinstall, но здесь это возможно только после копирования исходников.
RUN npx patch-package && bash ./scripts/build-vendored-contracts.sh

RUN npm run migrate:generate \
    && npm run generate:openapi \
    && test -s openapi.json \
    && npm run build \
    && npm prune --omit=dev \
    && npm install --omit=dev --ignore-scripts --no-audit --no-fund \
    && rm -rf node_modules/@xpanel/hashed-set node_modules/@xpanel/node-contract \
    && cp -a libs/hashed-set node_modules/@xpanel/hashed-set \
    && cp -a vendor/node-contract node_modules/@xpanel/node-contract \
    && npm cache clean --force

RUN cd node_modules/@prisma/client/runtime && \
    find . -maxdepth 1 -type f ! -name 'library.js' ! -name 'package.json' -delete && \
    cd /opt/app/node_modules/.prisma/client && \
    find . -maxdepth 1 -type f \
      \( -name 'edge.*' -o -name 'index-browser.js' -o -name 'wasm.*' \
         -o -name 'query_engine_bg.*' -o -name '*-loader.mjs' \) -delete && \
    cd /opt/app && \
    rm -rf node_modules/typescript \
           node_modules/effect/dist/esm \
           node_modules/effect/dist/dts \
           node_modules/effect/src && \
    find node_modules \( -name '*.js.map' -o -name '*.mjs.map' \) -delete && \
    find node_modules \( -name '*.d.ts' -o -name '*.d.cts' -o -name '*.d.mts' \) -delete

FROM node:24.20-trixie-slim

LABEL org.opencontainers.image.title="XPANEL"
LABEL org.opencontainers.image.description="Powerful proxy management tool"
LABEL org.opencontainers.image.url="https://github.com/kitten443/xpanel/backend"
LABEL org.opencontainers.image.source="https://github.com/kitten443/xpanel/backend"
LABEL org.opencontainers.image.vendor="XPANEL"
LABEL org.opencontainers.image.licenses="AGPL-3.0"
LABEL org.opencontainers.image.documentation="https://docs.xraypanel.dev"

WORKDIR /opt/app

ARG BRANCH=main
ARG __RW_METADATA_VERSION=1.1.1
ARG __RW_METADATA_GIT_BACKEND_COMMIT=0f344f388807f5323b49024a563b3f8146d66857
ARG __RW_METADATA_GIT_FRONTEND_COMMIT=0f344f388807f5323b49024a563b3f8146d66857
ARG __RW_METADATA_GIT_BRANCH=dev
ARG __RW_METADATA_BUILD_TIME=2011-11-11T11:11:11Z
ARG __RW_METADATA_BUILD_NUMBER=0

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

ENV REMNAWAVE_BRANCH=${BRANCH}
ENV PRISMA_HIDE_UPDATE_MESSAGE=true
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PM2_DISABLE_VERSION_CHECK=true
ENV NODE_OPTIONS="--max-old-space-size=16384"
ENV __RW_METADATA_VERSION=${__RW_METADATA_VERSION}
ENV __RW_METADATA_GIT_BACKEND_COMMIT=${__RW_METADATA_GIT_BACKEND_COMMIT}
ENV __RW_METADATA_GIT_FRONTEND_COMMIT=${__RW_METADATA_GIT_FRONTEND_COMMIT}
ENV __RW_METADATA_GIT_BRANCH=${__RW_METADATA_GIT_BRANCH}
ENV __RW_METADATA_BUILD_TIME=${__RW_METADATA_BUILD_TIME}
ENV __RW_METADATA_BUILD_NUMBER=${__RW_METADATA_BUILD_NUMBER}

COPY --from=backend-build /opt/app/dist ./dist
COPY --from=backend-build /opt/app/openapi.json ./openapi.json
COPY --from=frontend /opt/frontend/frontend_temp/dist ./frontend
COPY --from=backend-build /opt/app/prisma/generated ./prisma/generated
COPY --from=backend-build /opt/app/prisma/migrations ./prisma/migrations
COPY --from=backend-build /opt/app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=backend-build /opt/app/node_modules ./node_modules

COPY configs /var/lib/remnawave/configs
COPY package*.json ./
COPY prisma.config.ts ./prisma.config.ts
COPY ecosystem.config.js ./
COPY docker-entrypoint.sh ./

RUN npm install -g pm2 \
    && chmod +x /opt/app/dist/cli.js \
    && ln -s /opt/app/dist/cli.js /usr/local/bin/cli \
    && rm -rf /usr/local/lib/node_modules/npm \
        /usr/local/lib/node_modules/corepack \
        /usr/local/bin/npm \
        /usr/local/bin/npx \
        /usr/local/bin/corepack \
        /usr/local/include/node

ENTRYPOINT [ "/bin/sh", "docker-entrypoint.sh" ]
CMD [ "pm2-runtime", "start", "ecosystem.config.js", "--env", "production" ]