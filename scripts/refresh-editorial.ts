import { Store } from '../src/database.ts';
import { editorial } from '../src/editorial.ts';
import { eventSchema } from '../src/schema.ts';

const store=new Store(process.env.DATABASE_PATH??'./data/calendar.sqlite');
try {
  const updates=store.content().events.filter(event=>editorial[event.id]).map(event=>eventSchema.parse({...event,...editorial[event.id]}));
  if(updates.length!==40) throw new Error(`Expected 40 existing cards, found ${updates.length}; no changes applied`);
  store.transaction(()=>{for(const event of updates)store.putEvent(event);});
  const publication=store.publish();
  console.log(`Updated poetry and descriptions for ${updates.length} cards; publication ${publication.version}. Dates, images and settings retained.`);
} finally {store.close();}
