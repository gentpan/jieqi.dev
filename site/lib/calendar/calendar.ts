import lunar from 'lunar-javascript';
import { dateSchema } from './schema.ts';
import type { Event, Content, Snapshot } from './schema.ts';

export function chinaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function shiftDate(date:string,days:number) {
  return new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
}
const pad=(n:number)=>String(n).padStart(2,'0');
const termCache=new Map<number,Record<string,{date:string;occursAt:string}>>();
export function termDates(year:number) {
  const cached=termCache.get(year); if(cached) return cached;
  const table=lunar.Solar.fromYmd(year,7,1).getLunar().getJieQiTable();
  const result:Record<string,{date:string;occursAt:string}>={};
  for(const [key,value] of Object.entries(table)) {
    if(!value.toYmd().startsWith(`${year}-`)) continue;
    // This library uses DONG_ZHI for this December; 冬至 is the previous December.
    const name=key==='DONG_ZHI'?'冬至':key;
    if(!/^[\u4e00-\u9fff]+$/.test(name)) continue;
    result[name]={date:value.toYmd(),occursAt:value.toYmdHms().replace(' ','T')+'+08:00'};
  }
  termCache.set(year,result); return result;
}

export type Occurrence={
  key:string; eventId:string; name:string; category:'solar-term'|'festival'|'holiday';
  start:string; end:string; occursAt:string|null; priority:number; card:Event;
  workdays:string[]; sourceUrl:string|null;
};
export function occurrences(content:Content,year:number):Occurrence[] {
  const result:Occurrence[]=[];
  for(const event of content.events.filter(e=>e.enabled)) {
    const rule=event.rule;
    let date:string|undefined; let occursAt:string|null=null;
    if(rule.kind==='term') { const term=termDates(year)[rule.name]; date=term?.date; occursAt=term?.occursAt??null; }
    if(rule.kind==='solar') {
      const value=`${year}-${pad(rule.month)}-${pad(rule.day)}`;
      if(dateSchema.safeParse(value).success) date=value;
    }
    if(rule.kind==='lunar') {
      // Lunar December may occur in January of the following Gregorian year.
      for(const lunarYear of [year-1,year]) {
        try {
          const value=lunar.Lunar.fromYmd(lunarYear,rule.month,rule.day);
          const candidate=shiftDate(value.getSolar().toYmd(),rule.dayOffset??0);
          if(value.getMonth()===rule.month && value.getDay()===rule.day && candidate.startsWith(`${year}-`)) date=candidate;
        } catch { /* A lunar day 30 may not exist in a small month. */ }
      }
    }
    if(date) result.push({key:`${event.id}:${date.slice(0,4)}`,eventId:event.id,name:event.name,category:event.category,start:date,end:date,occursAt,priority:event.priority,card:event,workdays:[],sourceUrl:null});
  }
  for(const schedule of content.schedules.filter(s=>s.status==='confirmed')) {
    for(const holiday of schedule.holidays) {
      if(!holiday.start.startsWith(`${year}-`)&&!holiday.end.startsWith(`${year}-`)) continue;
      const event=content.events.find(e=>e.id===holiday.eventId && e.enabled); if(!event) continue;
      result.push({key:`${event.id}:${schedule.year}`,eventId:event.id,name:holiday.name,category:'holiday',start:holiday.start,end:holiday.end,occursAt:null,priority:event.priority,card:event,workdays:holiday.workdays,sourceUrl:schedule.sourceUrl});
    }
  }
  return result.sort((a,b)=>a.start.localeCompare(b.start)||b.priority-a.priority||a.key.localeCompare(b.key));
}

export function annual(snapshot:Snapshot,year:number) {
  return {schemaVersion:1,version:snapshot.version,year,timezone:'Asia/Shanghai',settings:snapshot.settings,
    schedule:snapshot.schedules.find(s=>s.year===year)??{year,status:'pending',sourceUrl:null,sourceTitle:'',holidays:[]},
    events:occurrences(snapshot,year)};
}

export function resolveDate(snapshot:Snapshot,date:string) {
  const year=Number(date.slice(0,4)); const settings=snapshot.settings;
  const all=[year-1,year,year+1].flatMap(y=>occurrences(snapshot,y));
  const unique=[...new Map(all.map(e=>[`${e.category}:${e.key}:${e.start}`,e])).values()];
  const enabled=(e:Occurrence)=>e.category==='holiday'?settings.holidaysEnabled:e.category==='solar-term'?settings.solarTermsEnabled:settings.festivalsEnabled;
  const rank=(e:Occurrence)=> (e.category==='holiday'?300:e.category==='festival'?200:100)+e.priority;
  const candidates=unique.filter(e=>enabled(e)&&date>=shiftDate(e.start,-settings.advanceDays)&&date<=e.end)
    .sort((a,b)=>Number(b.start<=date)-Number(a.start<=date)||rank(b)-rank(a)||a.start.localeCompare(b.start)||a.key.localeCompare(b.key));
  // Festival + its holiday share a key, so they do not become two popups.
  const deduped=[...new Map(candidates.map(e=>e.key).map(key=>[key,candidates.find(e=>e.key===key)!])).values()];
  const selected=deduped[0]??null;
  const currentTerm=unique.filter(e=>e.category==='solar-term'&&e.start<=date).sort((a,b)=>b.start.localeCompare(a.start))[0]??null;
  const next=unique.filter(e=>enabled(e)&&e.start>date).sort((a,b)=>a.start.localeCompare(b.start)||rank(b)-rank(a))[0]??null;
  return {schemaVersion:1,version:snapshot.version,date,timezone:'Asia/Shanghai',
    popup:{eligible:settings.popupEnabled&&!!selected,frequency:settings.frequency,delayMs:settings.delayMs,
      dedupeKey:selected?`jieqi:${settings.frequency==='once-per-day'?date:selected.key}`:null,
      candidates:deduped,selected},
    currentTerm,next,
    isMakeupWorkday:snapshot.schedules.some(s=>s.status==='confirmed'&&s.holidays.some(h=>h.workdays.includes(date))),
    holidayStatus:snapshot.schedules.find(s=>s.year===year)?.status??'pending',
    // Client rechecks on visibilitychange; this timestamp is Beijing's next midnight.
    nextCheckAt:`${shiftDate(date,1)}T00:00:00+08:00`,
  };
}
