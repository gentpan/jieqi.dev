import { getCalendar, respondStyled, preflight, fail } from '@/lib/api';
export async function GET(
  request: Request,
  context: { params: Promise<{ year: string }> },
) {
  try {
    const { year } = await context.params;
    return respondStyled(getCalendar(year), request);
  } catch {
    return fail();
  }
}
export const OPTIONS = preflight;
