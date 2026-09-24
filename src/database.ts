import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { settingsSchema } from './schema.ts';
import type { Event, Schedule, Settings, Content, Snapshot } from './schema.ts';

export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path, { timeout: 5000 });
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS schedules (year INTEGER PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS publications (version TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), version TEXT NOT NULL REFERENCES publications(version));
    `);
  }
  transaction<T>(fn:()=>T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result=fn(); this.db.exec('COMMIT'); return result; }
    catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }
  content(): Content {
    const parse = <T>(row: Record<string,unknown>) => JSON.parse(row.body as string) as T;
    const settings=this.db.prepare('SELECT body FROM settings WHERE id=1').get();
    return {
      events:this.db.prepare('SELECT body FROM events ORDER BY id').all().map(row=>parse<Event>(row)),
      schedules:this.db.prepare('SELECT body FROM schedules ORDER BY year').all().map(row=>parse<Schedule>(row)),
      settings:settings ? parse<Settings>(settings) : settingsSchema.parse({}),
    };
  }
  putEvent(event:Event) { this.db.prepare('INSERT INTO events VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(event.id,JSON.stringify(event)); }
  putSchedule(schedule:Schedule) { this.db.prepare('INSERT INTO schedules VALUES (?,?) ON CONFLICT(year) DO UPDATE SET body=excluded.body').run(schedule.year,JSON.stringify(schedule)); }
  putSettings(settings:Settings) { this.db.prepare('INSERT INTO settings VALUES (1,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(JSON.stringify(settings)); }
  publication(version?:string): Snapshot | null {
    const row=version
      ? this.db.prepare('SELECT body FROM publications WHERE version=?').get(version)
      : this.db.prepare('SELECT p.body FROM publications p JOIN state s ON s.version=p.version WHERE s.id=1').get();
    return row ? JSON.parse(row.body as string) : null;
  }
  publish(): Snapshot {
    return this.transaction(()=>{
      const snapshot:Snapshot={schemaVersion:1,version:randomUUID(),publishedAt:new Date().toISOString(),...this.content()};
      this.db.prepare('INSERT INTO publications VALUES (?,?)').run(snapshot.version,JSON.stringify(snapshot));
      this.activate(snapshot.version);
      return snapshot;
    });
  }
  activate(version:string) { this.db.prepare('INSERT INTO state VALUES (1,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version').run(version); }
  close() { this.db.close(); }
}
