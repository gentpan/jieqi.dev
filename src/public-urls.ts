/** Only presentation URLs change; stored/admin content keeps portable paths. */
export function staticOrigin(value = ''): string {
  if (!value) return '';
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('STATIC_ORIGIN must be an HTTP(S) origin');
  return url.origin;
}

export function withPublicImages(value: unknown, origin: string): unknown {
  if (!origin) return value;
  if (Array.isArray(value)) return value.map(item => withPublicImages(item, origin));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    key === 'image' && typeof item === 'string' && /^\/assets\/(?:[a-z][a-z0-9-]*\/)?[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(item)
      ? origin + item : withPublicImages(item, origin),
  ]));
  return value;
}
