import { z } from 'zod';

export const terms = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'] as const;
export const yearSchema = z.number().int().min(2000).max(2100);
export const idSchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(v + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, '日期不存在');
const ruleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('solar'), month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31) }).strict(),
  z.object({ kind: z.literal('lunar'), month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(30), dayOffset:z.number().int().min(-1).max(0).default(0) }).strict(),
  z.object({ kind: z.literal('term'), name: z.enum(terms) }).strict(),
]).refine(r => r.kind !== 'solar' || dateSchema.safeParse(`2000-${String(r.month).padStart(2,'0')}-${String(r.day).padStart(2,'0')}`).success, '公历月日无效');

export const eventSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(40),
  category: z.enum(['solar-term','festival']),
  rule: ruleSchema,
  quote: z.string().max(200).default(''),
  description: z.string().max(2000).default(''),
  image: z.string().regex(/^\/assets\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.(png|jpg|jpeg|webp)$/).nullable().default(null),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#b56f69'),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(50),
}).strict().refine(e => e.category !== 'solar-term' || e.rule.kind === 'term', '节气必须采用节气日期规则');

export const holidaySchema = z.object({
  id: idSchema, eventId: idSchema, name: z.string().trim().min(1).max(60),
  start: dateSchema, end: dateSchema,
  workdays: z.array(dateSchema).max(30).default([]),
}).strict().refine(h => h.end >= h.start && (Date.parse(h.end)-Date.parse(h.start))/86400000 <= 30, '假期起止顺序错误或超过31天');

export const scheduleSchema = z.object({
  year: yearSchema,
  status: z.enum(['pending','confirmed']),
  sourceUrl: z.url().startsWith('https://').nullable().default(null),
  sourceTitle: z.string().max(200).default(''),
  holidays: z.array(holidaySchema).max(40),
}).strict().superRefine((s,ctx) => {
  const issue = (message: string) => ctx.addIssue({code:'custom',message});
  if (s.status === 'pending' && s.holidays.length) issue('待公布年度不能包含假期安排');
  if (s.status === 'confirmed' && (!s.sourceUrl || !s.sourceTitle || !s.holidays.length)) issue('已确认安排需要来源和假期数据');
  if (new Set(s.holidays.map(h=>h.id)).size !== s.holidays.length) issue('假期ID重复');
  for (const h of s.holidays) {
    if (!h.start.startsWith(String(s.year)) && !h.end.startsWith(String(s.year))) issue('假期必须与所属年份相交');
    if (new Set(h.workdays).size !== h.workdays.length) issue('补班日期重复');
    for (const day of h.workdays) {
      if (Math.abs(Number(day.slice(0,4))-s.year)>1) issue('补班日期距离所属年份过远');
      if (s.holidays.some(other=>day>=other.start && day<=other.end)) issue('补班日期与假期冲突');
    }
  }
});

export const settingsSchema = z.object({
  timezone: z.literal('Asia/Shanghai').default('Asia/Shanghai'),
  popupEnabled: z.boolean().default(true),
  solarTermsEnabled: z.boolean().default(true),
  festivalsEnabled: z.boolean().default(true),
  holidaysEnabled: z.boolean().default(true),
  advanceDays: z.number().int().min(0).max(30).default(0),
  frequency: z.enum(['once-per-event','once-per-day']).default('once-per-event'),
  delayMs: z.number().int().min(0).max(30000).default(1500),
}).strict();

export type Event = z.infer<typeof eventSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Content = {events: Event[]; schedules: Schedule[]; settings: Settings};
export type Snapshot = Content & {schemaVersion: 1; version: string; publishedAt: string};
