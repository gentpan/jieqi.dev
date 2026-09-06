import { getCalendar, respond, preflight, fail } from '@/lib/api';
export async function GET(
  _request: Request,
  context: { params: Promise<{ year: string }> },
) {
  try {
    const { year } = await context.params;
    return respond(getCalendar(year));
  } catch {
    return fail();
  }
}
export const OPTIONS = preflight;
