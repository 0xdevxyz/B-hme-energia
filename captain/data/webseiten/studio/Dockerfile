FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV JWT_SECRET=hwL8IPuuuhIBuTqAUpDVIu5u+bJKmibEFkosDOa9feY=
ENV SMTP_HOST=localhost
ENV SMTP_PORT=25
ENV CLIENT_DIR=/app/clients/boehme-energia

EXPOSE 3000

CMD ["npm", "start"]
