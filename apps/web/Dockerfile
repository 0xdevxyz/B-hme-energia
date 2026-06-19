FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN npm install -g http-server

COPY --from=builder /app/dist ./dist

EXPOSE 3000

ENV NODE_ENV=production

CMD ["http-server", "dist", "-p", "3000", "-c-1"]
