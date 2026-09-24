import { styleCatalog } from '@/lib/calendar/styles';
import { respond, preflight } from '@/lib/api';
export const GET = () => respond({defaultStyle:'stamp',styles:styleCatalog});
export const OPTIONS = preflight;
