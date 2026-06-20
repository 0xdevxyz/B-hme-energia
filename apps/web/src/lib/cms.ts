const CMS_URL = 'https://cms.boehme-energie.com';

export async function getPageData() {
  try {
    const res = await fetch(`${CMS_URL}/api/pages?limit=1`);
    if (!res.ok) throw new Error('Failed to fetch page');
    const data = await res.json();
    return data.docs[0] || null;
  } catch (error) {
    console.error('CMS fetch error:', error);
    return null;
  }
}

export async function getPosts() {
  try {
    const res = await fetch(`${CMS_URL}/api/posts?limit=12`);
    if (!res.ok) throw new Error('Failed to fetch posts');
    const data = await res.json();
    return data.docs || [];
  } catch (error) {
    console.error('CMS fetch error:', error);
    return [];
  }
}

export function getCMSImageUrl(path: string | undefined) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${CMS_URL}${path}`;
}
