# ============================================================
# Dockerfile — CRM Frontend (React + Vite → nginx)
# Pune acest fisier in: CRM_Frontend/Dockerfile
# ============================================================

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --silent
COPY . .
ARG VITE_API_BASE=""
ARG VITE_TENANT_NAME="CRM Platform"
ARG VITE_PRIMARY_COLOR="#1677ff"
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_TENANT_NAME=$VITE_TENANT_NAME
ENV VITE_PRIMARY_COLOR=$VITE_PRIMARY_COLOR
RUN npm run build

# Stage 2: nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
