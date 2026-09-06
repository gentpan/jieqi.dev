import { getResolution, respond, preflight, fail } from '@/lib/api';
export function GET(request: Request) {
  try {
    return respond(getResolution(request), 'no-store');
  } catch {
    return fail();
  }
}
export const OPTIONS = preflight;
