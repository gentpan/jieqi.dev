import test from 'node:test';
import assert from 'node:assert/strict';
import {lunarDate,annual} from '../src/calendar.ts';
import {Store} from '../src/database.ts';
import {seed} from '../src/seed.ts';

test('civil lunar years switch at New Year, including the period after Li Chun',()=>{
  assert.equal(lunarDate('2026-01-01').ganZhi,'乙巳');
  assert.equal(lunarDate('2026-02-16').label,'乙巳蛇年 腊月廿九');
  assert.equal(lunarDate('2026-02-17').label,'丙午马年 正月初一');
  assert.equal(lunarDate('2027-02-06').label,'丁未羊年 正月初一');
  assert.equal(lunarDate('2025-07-25').label,'乙巳蛇年 闰六月初一');
  assert.equal(lunarDate('2025-07-25').isLeapMonth,true);
});
test('card dates change by year; holiday range preserves both lunar years',()=>{
  const store=new Store(':memory:');
  try {
    seed(store);const snapshot=store.publish();
    const thisYear=annual(snapshot,2026).events;const nextYear=annual(snapshot,2027).events;
    const a=thisYear.find(e=>e.eventId==='spring-festival'&&e.category==='festival')!;
    const b=nextYear.find(e=>e.eventId==='spring-festival'&&e.category==='festival')!;
    assert.equal(a.start,'2026-02-17');assert.equal(b.start,'2027-02-06');
    assert.equal(a.lunarStart.label,'丙午马年 正月初一');assert.equal(b.lunarStart.label,'丁未羊年 正月初一');
    const holiday=thisYear.find(e=>e.eventId==='spring-festival'&&e.category==='holiday')!;
    assert.equal(holiday.lunarStart.year,2025);assert.equal(holiday.lunarEnd.year,2026);
    assert.equal(thisYear.find(e=>e.eventId==='term-bailu')!.lunarStart.label,'丙午马年 七月廿六');
    assert.notEqual(thisYear.find(e=>e.eventId==='labour-day'&&e.category==='festival')!.lunarStart.label,nextYear.find(e=>e.eventId==='labour-day')!.lunarStart.label);
    for(const event of snapshot.events){assert.equal(event.quoteSource,'节期原创 · 古风短诗');assert.equal(event.quote.split('\n').length,2);assert.ok(event.description.length>=100,event.id);assert.equal(event.description.split('\n\n').length,2);}
  } finally {store.close();}
});
test('lunar dates match independent conversion, resolving known ICU day differences against HKO tables',()=>{
  // Independent official oracle for ICU disagreements (new moons near midnight):
  // https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2027e.pdf
  // https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2030e.pdf
  const officialDays:Record<string,number>={'2027-02-15':10,'2030-02-15':13};
  const formatter=new Intl.DateTimeFormat('en-u-ca-chinese',{timeZone:'Asia/Shanghai',year:'numeric',month:'numeric',day:'numeric'});
  for(let year=2000;year<=2100;year++)for(const month of [1,2,7,12]){
    const date=`${year}-${String(month).padStart(2,'0')}-15`;
    const expected=Object.fromEntries(formatter.formatToParts(new Date(date+'T04:00:00Z')).map(p=>[p.type,p.value]));
    const actual=lunarDate(date);
    assert.equal(actual.year,Number(expected.relatedYear),date);
    assert.equal(actual.month,parseInt(expected.month),date);
    assert.equal(actual.day,officialDays[date]??Number(expected.day),date);
    assert.equal(actual.isLeapMonth,expected.month.endsWith('bis'),date);
  }
});
