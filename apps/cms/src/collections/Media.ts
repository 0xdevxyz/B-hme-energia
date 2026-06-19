// apps/cms/src/collections/Media.ts
import { CollectionConfig } from 'payload/types';

const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticURL: '/media',
    staticDir: 'media',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        fit: 'cover',
      },
      {
        name: 'card',
        width: 800,
        height: 600,
        fit: 'cover',
      },
      {
        name: 'hero',
        width: 1600,
        height: 900,
        fit: 'cover',
      },
    ],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
};

export default Media;
