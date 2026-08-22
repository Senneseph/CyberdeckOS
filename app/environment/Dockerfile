# CyberdeckOS — the privileged service layer (trusted shim).
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY app/ app/
RUN npm run build

EXPOSE 16999

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:16999/health || exit 1

CMD ["node", "dist/main.js"]
