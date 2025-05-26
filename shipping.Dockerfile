# ------------ build stage ------------
FROM node:18-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm install --production

# Copia somente o serviço e protos necessários
COPY services/shipping ./services/shipping
COPY proto             ./proto

ENV NODE_ENV=production

# ------------ run stage --------------
USER node
CMD ["node", "services/shipping/index.js"]
