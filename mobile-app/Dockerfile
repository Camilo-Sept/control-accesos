FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_TABLET_API_KEY
ARG VITE_DEVICE_ID

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_TABLET_API_KEY=$VITE_TABLET_API_KEY
ENV VITE_DEVICE_ID=$VITE_DEVICE_ID

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]