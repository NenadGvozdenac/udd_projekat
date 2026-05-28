# --- dev stage (used by docker-compose) ---
FROM node:20-alpine AS dev

WORKDIR /app
COPY package*.json ./
RUN npm ci
# src is mounted as a volume at runtime
EXPOSE 4000
CMD ["npm", "run", "dev"]

# --- production build ---
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
