FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run tsc-only

EXPOSE 3000

ENV NODE_ENV=production

CMD ["sh", "-c", "node_modules/.bin/payload build && npm start"]
