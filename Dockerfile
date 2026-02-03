FROM node:20-slim

ENV NPM_CONFIG_LOGLEVEL=warn
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src

RUN useradd -m appuser
USER appuser

ENTRYPOINT ["node", "src/worker.js"]
