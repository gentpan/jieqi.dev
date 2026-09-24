import { z } from 'zod';
import { seriesArtwork, seriesEventIds } from './artwork.ts';

export const styleSchema = z.enum(['stamp', 'watercolor', 'papercut', 'clay', 'minimal', 'character', 'anime', 'sweet', 'woodblock', 'embroidery']);
export type StyleId = z.infer<typeof styleSchema>;
export const styleCatalog = [
  { id: 'stamp', name: '邮票', coverage: 'complete', eventIds: null },
  { id: 'watercolor', name: '水彩手绘', coverage: 'complete', eventIds: seriesEventIds },
  { id: 'papercut', name: '层叠剪纸', coverage: 'complete', eventIds: seriesEventIds },
  { id: 'clay', name: '软萌粘土', coverage: 'complete', eventIds: seriesEventIds },
  { id: 'minimal', name: '极简', coverage: 'complete', eventIds: seriesEventIds },
  { id: 'character', name: '拟人', coverage: 'complete', eventIds: seriesEventIds },
  { id: 'anime', name: '手绘动画', coverage: 'complete', eventIds: seriesEventIds },
  { id: 'sweet', name: '甜系少女', coverage: 'complete', eventIds: seriesEventIds },
  { id: 'woodblock', name: '木刻版画', coverage: 'complete', eventIds: seriesEventIds },
  { id: 'embroidery', name: '丝线刺绣', coverage: 'complete', eventIds: seriesEventIds },
] as const;
const artwork: Record<string, Partial<Record<StyleId, string>>> = seriesArtwork;

export function selectArtwork(eventId: string, original: string | null, requested: StyleId) {
  const replacement = artwork[eventId]?.[requested];
  const resolved = replacement ? requested : 'stamp';
  return { image: replacement ?? original, requested, resolved, fallback: resolved !== requested };
}

/** Clone public payloads so one request's style cannot alter shared snapshots/caches. */
export function withArtworkStyle(value: unknown, style: StyleId): unknown {
  if (Array.isArray(value)) return value.map(item => withArtworkStyle(item, style));
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (typeof object.id === 'string' && 'image' in object && (object.category === 'solar-term' || object.category === 'festival')) {
      const { image, ...artworkStyle } = selectArtwork(object.id, object.image as string | null, style);
      return { ...object, image, artworkStyle };
    }
    return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, withArtworkStyle(item, style)]));
  }
  return value;
}
