import { getResolution, respondStyled, preflight, fail } from '@/lib/api';
export function GET(request: Request) {
  try {
    return respondStyled(getResolution(request), request, 'no-store');
  } catch {
    return fail();
  }
}
export const OPTIONS = preflight;
