export const apiOrigin = (process.env.NEXT_PUBLIC_JIEQI_API_ORIGIN ?? '').replace(/\/$/, '');
export const assetOrigin = (process.env.NEXT_PUBLIC_JIEQI_STATIC_ORIGIN ?? '').replace(/\/$/, '');
export const siteOrigin = (process.env.NEXT_PUBLIC_JIEQI_SITE_ORIGIN ?? '').replace(/\/$/, '');
export const assetUrl = (path: string) => path.startsWith('/') && !path.startsWith('//') ? assetOrigin + path : path;
