import Link from 'next/link';
import { Icon, Mark, Wave, type IconName } from './Icon';
import { KINDS, LEVELS, MONTHS, levelProgress, seasonInfo, type InitiativeTrack, type Kind, type SubmissionStatus } from '@/lib/domain';
import { fmtNum, initials } from '@/lib/format';

export function Brand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Голос компании — на главную">
      <Mark />
      <span className="brand-name">Голос компании</span>
    </Link>
  );
}

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`avatar ${className}`}>{initials(name)}</span>;
}

export function KindIcon({ kind, size = 'md' }: { kind: Kind; size?: 'sm' | 'md' | 'lg' }) {
  const k = KINDS[kind] ?? KINDS.post;
  return (
    <span className={`t-ic k-${kind} ${size === 'md' ? '' : size}`}>
      <Icon name={k.icon} size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
    </span>
  );
}

export function SubmissionChip({ status }: { status: SubmissionStatus | null | undefined }) {
  if (status === 'approved') return <span className="chip good"><Icon name="check" size={13} /> Принято</span>;
  if (status === 'pending') return <span className="chip warn">На проверке</span>;
  if (status === 'returned') return <span className="chip bad">На доработке</span>;
  return null;
}

export function Alert({ tone = 'info', icon, children }: { tone?: 'info' | 'good' | 'warn' | 'bad'; icon?: IconName; children: React.ReactNode }) {
  const ic: IconName = icon ?? (tone === 'good' ? 'check' : tone === 'bad' ? 'no' : tone === 'warn' ? 'shield' : 'info');
  return (
    <div className={`alert ${tone === 'info' ? '' : tone}`} role={tone === 'bad' ? 'alert' : 'status'}>
      <Icon name={ic} size={18} />
      <div className="min0">{children}</div>
    </div>
  );
}

export function Empty({ icon = 'inbox', title, children }: { icon?: IconName; title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={30} />
      <b>{title}</b>
      {children ? <span className="sub">{children}</span> : null}
    </div>
  );
}

export function PageHead({ title, sub, eyebrow, actions }: { title: string; sub?: React.ReactNode; eyebrow?: string; actions?: React.ReactNode }) {
  return (
    <header className="page-head">
      <div className="stack">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="h1">{title}</h1>
        {sub ? <p className="sub">{sub}</p> : null}
      </div>
      {actions ? <div className="row">{actions}</div> : null}
    </header>
  );
}

export function LevelCard({ points, track, compact = false }: { points: number; track: InitiativeTrack; compact?: boolean }) {
  const { lv, nx, pct, toNext, needText } = levelProgress(points, track);
  const next = !nx ? 'Высший уровень сезона'
    : toNext > 0 ? `Ещё ${fmtNum(toNext)} баллов${needText ? ` и ${needText}` : ''} до уровня «${nx.name}»`
    : `Баллов хватает. Для уровня «${nx.name}» нужно ещё: ${needText}`;
  return (
    <section className="level" aria-label="Уровень">
      <Wave />
      <div className="level-top">
        <span>Уровень {lv.n} из 4</span>
        <span><b>{fmtNum(points)}</b> баллов сезона</span>
      </div>
      <h2 className="lvl-name">{lv.name}</h2>
      <div className="lvl-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Прогресс до следующего уровня">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p style={{ fontSize: 13.5 }}>{next}</p>
      {compact ? null : (
        <ol className="lvl-steps">
          {LEVELS.map((l) => (
            <li key={l.n} className={l.n < lv.n ? 'past' : l.n === lv.n ? 'now' : ''}>
              <span>{l.n}</span>
              {l.name}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function SeasonStrip() {
  const s = seasonInfo();
  return (
    <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
      <ol className="months">
        {MONTHS.map((m, i) => (
          <li key={m.m} className={`mon k-${m.k} ${i === s.monthIdx ? 'cur' : ''} ${s.monthIdx >= 0 && i < s.monthIdx ? 'past' : ''}`}>
            <i />
            {m.short}
          </li>
        ))}
      </ol>
      <p><b>{s.current ? s.current.now : 'Межсезонье: у студентов практика, новый набор в сентябре'}</b></p>
      <div className="legend">
        <span><i className="lg-prep" />подготовка</span>
        <span><i className="lg-sprint" />спринты</span>
        <span><i className="lg-fest" />фестиваль</span>
        <span><i className="lg-final" />итоги</span>
      </div>
    </div>
  );
}

export function MediaPreview({ url, name }: { url: string; name?: string | null }) {
  const lower = (name || url).toLowerCase().split('?')[0];
  if (/\.(png|jpe?g|webp|gif|heic|avif)$/.test(lower)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <a className="media-prev" href={url} target="_blank" rel="noreferrer"><img src={url} alt={name || 'Вложение'} loading="lazy" /></a>;
  }
  if (/\.(mp4|webm|mov|m4v)$/.test(lower)) return <div className="media-prev"><video src={url} controls preload="metadata" /></div>;
  if (/\.(mp3|m4a|ogg|wav|aac|opus)$/.test(lower)) return <div className="media-prev" style={{ padding: 8 }}><audio src={url} controls preload="metadata" /></div>;
  return <a className="link row" href={url} target="_blank" rel="noreferrer"><Icon name="file" size={16} /> {name || 'Открыть файл'}</a>;
}
