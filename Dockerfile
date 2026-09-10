FROM node:24-alpine

ARG APP_VERSION=0.6.1
LABEL org.opencontainers.image.title="RFD Board Hub" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.source="https://github.com/xyciasav/rfd-board-hub"

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data \
    APP_VERSION=${APP_VERSION}

COPY --chown=node:node package.json ./
COPY --chown=node:node server.js ./
COPY --chown=node:node public ./public
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1

CMD ["node", "server.js"]
