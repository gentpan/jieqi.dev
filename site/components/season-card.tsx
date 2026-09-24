import CardArtwork from '@/components/card-artwork';
import type { Occurrence } from '@/lib/calendar/calendar';
import { assetUrl } from '@/lib/urls';

export default function SeasonCard({
  event,
  image,
  compact = false,
}: {
  event: Occurrence;
  image?: string;
  compact?: boolean;
}) {
  const kind =
    event.category === 'solar-term'
      ? '二十四节气'
      : event.category === 'holiday'
        ? '假期来信'
        : '中国节日';
  return (
    <article className={`season-card${compact ? ' compact-card' : ''}`}>
      <div className="card-copy">
        <p className="eyebrow">
          {kind}
          <span className="tiny-line" />
          {event.category === 'solar-term'
            ? 'THE SOLAR TERMS'
            : 'A FESTIVAL LETTER'}
        </p>
        <h2>{event.card.name}</h2>
        <p className="card-quote">{event.card.quote}</p>
        <div className="card-description">{event.card.description.split(/\n\s*\n/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
        {event.category === 'holiday' && (
          <p className="holiday-note">
            {event.name} · 共{' '}
            {Math.round(
              (Date.parse(event.end) - Date.parse(event.start)) / 86400000,
            ) + 1}{' '}
            天
            {event.workdays.length > 0 &&
              ` · 补班 ${event.workdays.map((d) => d.slice(5).replace('-', '/')).join('、')}`}
          </p>
        )}
      </div>
      {(image || event.card.image) && (
          <CardArtwork
            key={assetUrl(image || event.card.image!)}
            src={assetUrl(image || event.card.image!)}
            name={event.card.name}
          />
      )}
      <div className="card-signoff">
        <span>愿日子有光，心有所期。</span>
        <span className="small-seal">节期</span>
      </div>
      <div className="card-dates" aria-label="公历与农历日期">
        <p className="card-date">
          公历 <time dateTime={event.start}>{event.start.replaceAll('-', '/')}</time>
          {event.end !== event.start && <> — <time dateTime={event.end}>{event.end.replaceAll('-', '/')}</time></>}
        </p>
        <p className="card-lunar">
          农历 {event.lunarStart.label}
          {event.end !== event.start && <> — {event.lunarEnd.label}</>}
        </p>
      </div>
    </article>
  );
}
