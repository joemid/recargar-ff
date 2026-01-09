FROM ghcr.io/puppeteer/puppeteer:23.0.0

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV RAILWAY_ENVIRONMENT=true

CMD ["node", "server.js"]
