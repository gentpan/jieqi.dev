import Image from 'next/image';
import type { Occurrence } from '@/lib/calendar/calendar';

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
        <p className="card-date">
          <time dateTime={event.start}>
            {event.start.replaceAll('-', ' / ')}
          </time>
          {event.end !== event.start && (
            <>
              {' '}
              —{' '}
              <time dateTime={event.end}>
                {event.end.replaceAll('-', ' / ')}
              </time>
            </>
          )}
        </p>
        <p className="card-quote">{event.card.quote}</p>
        <p className="card-description">{event.card.description}</p>
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
        <div className="card-signoff">
          <span>愿日子有光，心有所期。</span>
          <span className="small-seal">节期</span>
        </div>
      </div>
      <div className="card-art">
        {(image || event.card.image) && (
          <Image
            unoptimized
            src={image || event.card.image!}
            alt={`${event.card.name}插画`}
            width={1024}
            height={1536}
          />
        )}
        <div className="postmark" aria-hidden="true">
          <span>岁 时 有 信</span>
          <strong>JIEQI</strong>
          <span>寄 给 此 刻</span>
        </div>
      </div>
    </article>
  );
}
