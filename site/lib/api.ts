import snapshotData from './snapshot.json';
import { dateSchema, yearSchema } from './calendar/schema';
import type { Snapshot } from './calendar/schema';
import { annual, chinaDate, resolveDate } from './calendar/calendar';
export const snapshot = snapshotData as unknown as Snapshot;
const calendarCache = new Map<number, ReturnType<typeof annual>>();
const dateCache = new Map<string, ReturnType<typeof resolveDate>>();
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'ETag',
  'X-Content-Type-Options': 'nosniff',
};
export const preflight = () => new Response(null, { status: 204, headers });
export function respond(value: unknown, cache = 'public, max-age=60') {
  return Response.json(value, {
    headers: { ...headers, 'Cache-Control': cache },
  });
}
export function fail() {
  return Response.json(
    { error: '日期或年份无效。支持2000至2100年。' },
    { status: 400, headers: { ...headers, 'Cache-Control': 'no-store' } },
  );
}
export function getCalendar(year: string) {
  const value = year.replace(/\.json$/, '');
  if (!/^\d{4}$/.test(value)) throw new Error('Invalid year');
  const parsed = yearSchema.parse(Number(value));
  if (!calendarCache.has(parsed))
    calendarCache.set(parsed, annual(snapshot, parsed));
  return calendarCache.get(parsed)!;
}
export function getResolution(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.getAll('date').length > 1) throw new Error('Duplicate date');
  const date = dateSchema.parse(params.get('date') ?? chinaDate());
  yearSchema.parse(Number(date.slice(0, 4)));
  if (!dateCache.has(date)) {
    if (dateCache.size >= 64) dateCache.delete(dateCache.keys().next().value!);
    dateCache.set(date, resolveDate(snapshot, date));
  }
  return dateCache.get(date)!;
}
