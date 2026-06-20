// apps/cms/src/server.ts
import express from 'express';
import payload from 'payload';

const app = express();
const PORT = process.env.PORT || 3000;

const start = async () => {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || 'CHANGE_ME',
    express: app,
    onInit: async () => {
      payload.logger.info(`Payload admin URL: ${payload.getAdminURL()}`);
    },
  });

  app.listen(PORT, async () => {
    payload.logger.info(`Server listening on http://localhost:${PORT}`);
  });
};

start();
