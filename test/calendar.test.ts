import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/database.ts';
import { seed } from '../src/seed.ts';
import { annual, chinaDate, occurrences, resolveDate, termDates } from '../src/calendar.ts';
import { dateSchema, eventSchema, scheduleSchema } from '../src/schema.ts';

function snapshot() {const store=new Store(':memory:');seed(store);const data=store.publish();store.close();return data;}

test('Beijing date changes at 16:00 UTC, independent of machine timezone',()=>{
  assert.equal(chinaDate(new Date('2026-09-06T15:59:59Z')),'2026-09-06');
  assert.equal(chinaDate(new Date('2026-09-06T16:00:00Z')),'2026-09-07');
});
test('all 24 terms belong to their Gregorian year, including winter solstice',()=>{
  for(const year of [2000,2024,2025,2026,2027,2100]) {
    const dates=Object.values(termDates(year));assert.equal(dates.length,24);
    assert.ok(dates.every(t=>t.date.startsWith(`${year}-`)));
  }
  assert.equal(termDates(2026)['冬至'].date,'2026-12-22');
  assert.equal(termDates(2026)['白露'].date,'2026-09-07');
  assert.equal(termDates(2026)['秋分'].date,'2026-09-23');
});
test('lunar festivals move by year; lunar December is resolved in the next Gregorian year',()=>{
  const content=snapshot();
  const find=(year:number,id:string)=>occurrences(content,year).find(e=>e.eventId===id&&e.category==='festival')?.start;
  assert.equal(find(2026,'spring-festival'),'2026-02-17');
  assert.equal(find(2025,'spring-festival'),'2025-01-29');
  assert.equal(find(2026,'dragon-boat'),'2026-06-19');
  assert.equal(find(2026,'mid-autumn'),'2026-09-25');
  content.events.push(eventSchema.parse({id:'laba',name:'腊八',category:'festival',rule:{kind:'lunar',month:12,day:8}}));
  assert.equal(find(2026,'laba'),'2026-01-26');
});
test('holiday window differs from the festival date and collapses into one popup candidate',()=>{
  const data=snapshot();
  const before=resolveDate(data,'2026-02-15');assert.equal(before.popup.selected?.name,'春节假期');
  const during=resolveDate(data,'2026-02-17');
  assert.equal(during.popup.candidates.filter(e=>e.eventId==='spring-festival').length,1);
  assert.equal(during.popup.dedupeKey,before.popup.dedupeKey);
  assert.equal(resolveDate(data,'2026-02-24').popup.eligible,false);
  assert.equal(resolveDate(data,'2026-02-28').isMakeupWorkday,true);
});
test('ordinary days stay quiet while current solar term remains available',()=>{
  const result=resolveDate(snapshot(),'2026-09-08');
  assert.equal(result.popup.eligible,false);assert.equal(result.currentTerm?.name,'白露');
  assert.equal(result.nextCheckAt,'2026-09-09T00:00:00+08:00');
});
test('unknown holiday schedules stay pending, without copying last year',()=>{
  const calendar=annual(snapshot(),2027);
  assert.equal(calendar.schedule.status,'pending');assert.equal(calendar.events.filter(e=>e.category==='holiday').length,0);
  assert.ok(calendar.events.some(e=>e.eventId==='spring-festival'));
});
test('advance reminder works across December/January and day-level frequency changes its key',()=>{
  const data=snapshot();data.settings.advanceDays=1;data.settings.frequency='once-per-day';
  const result=resolveDate(data,'2025-12-31');
  assert.equal(result.popup.selected?.eventId,'new-year');assert.equal(result.popup.eligible,true);
  assert.equal(result.popup.dedupeKey,'jieqi:2025-12-31');
  data.settings.popupEnabled=false;assert.equal(resolveDate(data,'2026-01-01').popup.eligible,false);
});
test('category switches are respected; disabling holiday still permits festival on its day',()=>{
  const data=snapshot();data.settings.holidaysEnabled=false;
  assert.equal(resolveDate(data,'2026-02-15').popup.eligible,false);
  assert.equal(resolveDate(data,'2026-02-17').popup.selected?.category,'festival');
  data.settings.festivalsEnabled=false;
  assert.equal(resolveDate(data,'2026-02-17').popup.eligible,false);
});
test('overlapping Mid-Autumn and National Day keep both candidates with deterministic priority',()=>{
  const result=resolveDate(snapshot(),'2020-10-01');
  assert.ok(result.popup.candidates.some(e=>e.eventId==='national-day'));
  assert.ok(result.popup.candidates.some(e=>e.eventId==='mid-autumn'));
});
test('invalid civil dates, impossible solar rules and pending holiday intervals are rejected',()=>{
  assert.equal(dateSchema.safeParse('2026-02-30').success,false);
  assert.equal(eventSchema.safeParse({id:'invalid',name:'错误',category:'festival',rule:{kind:'solar',month:2,day:30}}).success,false);
  const schedule=snapshot().schedules[0];
  assert.equal(scheduleSchema.safeParse({...schedule,status:'pending'}).success,false);
  const conflict=structuredClone(schedule);conflict.holidays[0].workdays=['2026-02-17'];
  assert.equal(scheduleSchema.safeParse(conflict).success,false);
});
test('Feb 29 custom event appears only in leap years',()=>{
  const data=snapshot();data.events.push(eventSchema.parse({id:'leap-day',name:'闰日',category:'festival',rule:{kind:'solar',month:2,day:29}}));
  assert.ok(occurrences(data,2024).some(e=>e.eventId==='leap-day'));
  assert.ok(!occurrences(data,2026).some(e=>e.eventId==='leap-day'));
});
test('New Year’s Eve uses the day before lunar new year, including lunar years without a thirtieth day',()=>{
  const data=snapshot();
  for(const [year,date] of [[2026,'2026-02-16'],[2025,'2025-01-28'],[2024,'2024-02-09']] as const) {
    assert.equal(occurrences(data,year).find(e=>e.eventId==='new-years-eve')?.start,date);
  }
});
