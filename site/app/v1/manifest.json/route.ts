import { snapshot, respondStyled, preflight, fail } from '@/lib/api';
import { styleCatalog } from '@/lib/calendar/styles';
export const GET = (request: Request) => {
  try { return respondStyled({
    ...snapshot,
    events: snapshot.events.filter((e) => e.enabled),
    supportedYears: { from: 2000, to: 2100 },
    styles: styleCatalog,
  }, request); } catch { return fail(); }
};
export const OPTIONS = preflight;
