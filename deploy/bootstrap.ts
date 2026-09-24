import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Store } from '../src/database.ts';
import { eventSchema, scheduleSchema, settingsSchema } from '../src/schema.ts';

const database = process.env.DATABASE_PATH;
if (!database) throw new Error('DATABASE_PATH is required');
const store = new Store(database);
try {
  if (store.publication()) {
    console.log('Existing published content retained.');
  } else {
    const content = JSON.parse(readFileSync('site/lib/snapshot.json', 'utf8'));
    const events = content.events.map((e: unknown) => eventSchema.parse(e));
    const schedules = content.schedules.map((s: unknown) => scheduleSchema.parse(s));
    const settings = settingsSchema.parse(content.settings);
    for (const event of events) if (event.image && !existsSync(resolve('public', '.' + event.image))) throw new Error(`Missing image: ${event.image}`);
    store.transaction(() => {
      for (const event of events) store.putEvent(event);
      for (const schedule of schedules) store.putSchedule(schedule);
      store.putSettings(settings);
    });
    store.publish();
    console.log(`Initialized ${events.length} published cards.`);
  }
} finally { store.close(); }
