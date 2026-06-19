// apps/cms/src/payload.config.ts
import { buildConfig } from 'payload/config';
import path from 'path';
import Users from './collections/Users';
import Pages from './collections/Pages';
import Posts from './collections/Posts';
import Media from './collections/Media';

export default buildConfig({
  admin: {
    user: Users.slug,
    watchAdmin: false,
  },
  collections: [Users, Pages, Posts, Media],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  db: {
    mongoURL: process.env.DATABASE_URI || 'mongodb://localhost:27017/boehme',
  },
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
  secret: process.env.PAYLOAD_SECRET || 'CHANGE_ME',
});
