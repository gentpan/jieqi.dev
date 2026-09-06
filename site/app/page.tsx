import HomeClient from '@/components/home-client';
import variants from '@/lib/variants.json';
import { chinaDate } from '@/lib/calendar/calendar';
import { getCalendar } from '@/lib/api';

export default function Home() {
  const today = chinaDate();
  const calendar = getCalendar(today.slice(0, 4));
  return (
    <HomeClient
      events={calendar.events.filter((e) => e.category !== 'holiday')}
      holidays={calendar.events.filter((e) => e.category === 'holiday')}
      today={today}
      variants={variants}
    />
  );
}
