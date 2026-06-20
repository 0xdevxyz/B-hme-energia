// apps/cms/src/payload.config.ts
import { buildConfig } from 'payload/config';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { webpackBundler } from '@payloadcms/bundler-webpack';
import path from 'path';
import Users from './collections/Users';
import Pages from './collections/Pages';
import Posts from './collections/Posts';
import Media from './collections/Media';

// @ts-ignore - editor is provided by payload internals at runtime
export default buildConfig({
  admin: {
    user: Users.slug,
    bundler: webpackBundler(),
  },
  collections: [Users, Pages, Posts, Media],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || 'mongodb://localhost:27017/boehme',
  }),
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
} as any);
