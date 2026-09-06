import { snapshot, respond, preflight } from '@/lib/api';
export const GET = () =>
  respond({
    ...snapshot,
    events: snapshot.events.filter((e) => e.enabled),
    supportedYears: { from: 2000, to: 2100 },
  });
export const OPTIONS = preflight;
