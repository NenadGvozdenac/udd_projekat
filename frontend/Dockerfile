# --- dev stage (used by docker-compose) ---
FROM node:20-alpine AS dev

WORKDIR /app
COPY package*.json ./
RUN npm ci
# src is mounted as a volume at runtime — no COPY needed
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- production build ---
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
