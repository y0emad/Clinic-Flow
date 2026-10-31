# One image for the whole app: the React frontend is built, then served by the Express API.

# ---------- 1) Frontend: build the React app into static files ----------
FROM node:24-slim AS client
WORKDIR /client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client ./
RUN npm run build

# ---------- 2) Backend: install everything and compile TypeScript ----------
FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---------- 3) Runtime: production dependencies + compiled API + built frontend ----------
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=client /client/dist ./client/dist
COPY drizzle ./drizzle

# Don't run as root.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Apply pending migrations, then start the app (API on /api, website on every other path).
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
