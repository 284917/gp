import Link from 'next/link';
import { Icon } from './Icon';
import { FORMATS, INITIATIVE_STATUS, INITIATIVE_STEPS, SEGMENTS, groupOf, stepIndex, type InitiativeFormat, type InitiativeStatus } from '@/lib/domain';
import { initials, plural } from '@/lib/format';
import { isMixed, type InitiativeCard, type Person } from '@/lib/initiatives';

export function FormatIcon({ format, size = 'md' }: { format: InitiativeFormat; size?: 'sm' | 'md' | 'lg' }) {
  const f = FORMATS[format] ?? FORMATS.event;
  return (
    <span className={`t-ic f-${format} ${size === 'md' ? '' : size}`}>
      <Icon name={f.icon} size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
    </span>
  );
}

export function InitiativeChip({ status }: { status: InitiativeStatus }) {
  const s = INITIATIVE_STATUS[status];
  return <span className={`chip ${s.tone}`}>{status === 'recruiting' ? <i className="live" aria-hidden="true" /> : null}{s.label}</span>;
}

/** Аватары команды внахлёст: сотрудники синие, студенты оранжевые, пустые места пунктиром. */
export function TeamStack({ team, size, max = 5 }: { team: Person[]; size?: number; max?: number }) {
  const shown = team.slice(0, max);
  const free = size ? Math.max(0, Math.min(size, max) - shown.length) : 0;
  return (
    <span className="team" aria-label={`В команде ${team.length}${size ? ` из ${size}` : ''}`}>
      {shown.map((p, i) => (
        <span key={p.id} className={`avatar sm ${groupOf(p.segment) === 'external' ? 'alt' : 'soft'}`} style={{ '--i': i } as React.CSSProperties} title={p.name}>
          {initials(p.name)}
        </span>
      ))}
      {Array.from({ length: free }, (_, i) => <span key={`f${i}`} className="avatar sm seat" aria-hidden="true"><Icon name="plus" size={14} /></span>)}
    </span>
  );
}

export function Stepper({ status }: { status: InitiativeStatus }) {
  const at = stepIndex(status);
  const declined = status === 'declined';
  return (
    <ol className={`stepper ${declined ? 'declined' : ''}`} style={{ '--at': at } as React.CSSProperties} aria-label="Этапы инициативы">
      {INITIATIVE_STEPS.map((s, i) => (
        <li key={s.key} className={i < at || status === 'done' ? 'past' : i === at ? 'now' : ''} aria-current={i === at ? 'step' : undefined}>
          <span className="dotn">{i < at || status === 'done' ? <Icon name="check" size={14} /> : i + 1}</span>
          <span className="lbl">{declined && i === 0 ? 'Не согласована' : status === 'reporting' && i === 2 ? 'Итоги на проверке' : s.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function InitiativeTile({ i, href, index = 0 }: { i: InitiativeCard; href: string; index?: number }) {
  const free = Math.max(0, i.teamSize - i.team.length);
  const mixed = isMixed(i.team);
  return (
    <Link href={href} className={`itile st-${i.status}`} data-reveal style={{ '--i': index % 6 } as React.CSSProperties}>
      <span className="itile-top">
        <FormatIcon format={i.format} />
        <span className="min0 grow">
          <span className="fine">{FORMATS[i.format].label} · {i.regionCity}</span>
          <span className="itile-title">{i.title}</span>
        </span>
        <InitiativeChip status={i.status} />
      </span>
      <span className="itile-sum">{i.status === 'done' ? i.goal : i.summary}</span>
      {i.status === 'recruiting' || i.status === 'idea' ? (
        <span className="who-need">
          {i.lookingFor.map((s) => <span key={s} className={`chip ${groupOf(s) === 'external' ? 'accent' : 'brand'}`}>{SEGMENTS[s].label}</span>)}
        </span>
      ) : null}
      <span className="itile-foot">
        <TeamStack team={i.team} size={i.status === 'recruiting' ? i.teamSize : undefined} />
        <span className="fine grow">
          {i.status === 'recruiting'
            ? free ? `${free} ${plural(free, 'место', 'места', 'мест')} свободно` : 'команда собрана'
            : `${i.team.length} ${plural(i.team.length, 'участник', 'участника', 'участников')}`}
          {mixed ? ' · смешанная команда' : ''}
        </span>
        {i.replicas ? <span className="chip good"><Icon name="repeat" size={13} /> {i.replicas}</span> : null}
        {i.sourceCity ? <span className="chip"><Icon name="repeat" size={13} /> из {i.sourceCity}</span> : null}
      </span>
    </Link>
  );
}
