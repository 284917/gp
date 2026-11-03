import Link from 'next/link';
import { Icon } from './Icon';
import { Avatar } from './ui';
import { FormatIcon, InitiativeChip, Stepper } from './Initiative';
import { FORMATS, SEGMENTS, groupOf } from '@/lib/domain';
import { fmtDate, fmtNum, plural } from '@/lib/format';
import { isMixed, type InitiativeDetail } from '@/lib/initiatives';

/** Общая страница инициативы для амбассадора и куратора. Действия роли приходят в слотах. */
export function InitiativeView({ d, base, actions, teamActions, below }: {
  d: InitiativeDetail;
  base: string;
  actions?: React.ReactNode;
  teamActions?: (userId: number) => React.ReactNode;
  below?: React.ReactNode;
}) {
  const accepted = d.members.filter((m) => m.status === 'accepted');
  const requests = d.members.filter((m) => m.status === 'requested');
  const mixed = isMixed(accepted);
  const steps = (d.playbook ?? '').split('\n').map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <section className={`ihead st-${d.status}`} data-reveal>
        <div className="ihead-top">
          <FormatIcon format={d.format} size="lg" />
          <div className="min0 grow stack" style={{ '--gap': '6px' } as React.CSSProperties}>
            <p className="eyebrow">{FORMATS[d.format].label} · {d.regionCity}{d.audience ? ` · ${d.audience}` : ''}</p>
            <h1 className="h1">{d.title}</h1>
            <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
              <InitiativeChip status={d.status} />
              {mixed ? <span className="chip good"><Icon name="tandem" size={13} /> смешанная команда</span> : null}
              {d.onSite ? <span className="chip warn"><Icon name="shield" size={13} /> на объекте, с куратором</span> : null}
              {d.sourceId ? <Link className="chip" href={`${base}/${d.sourceId}`}><Icon name="repeat" size={13} /> формат из города {d.sourceCity}</Link> : null}
            </div>
          </div>
        </div>
        <Stepper status={d.status} />
      </section>

      {d.status === 'done' ? (
        <section className="done-band" data-reveal>
          <span className="burst" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</span>
          <Icon name="trophy" size={28} />
          <div className="min0 grow">
            <b>Проект завершён {d.doneAt ? fmtDate(d.doneAt) : ''}</b>
            <span>{d.replicaList.length
              ? `Формат уже повторили: ${d.replicaList.map((r) => r.regionCity).join(', ')}`
              : 'Формат в библиотеке и ждёт команду, которая повторит его в своём регионе.'}</span>
          </div>
        </section>
      ) : null}

      <div className="grid-main">
        <div className="stack">
          <section className="card" data-reveal>
            <p className="label">Идея</p>
            <p className="text-pre">{d.summary}</p>
            <div className="goal-box">
              <Icon name="flag" size={18} />
              <div className="min0"><p className="label">Ожидаемый результат</p><p className="text-pre">{d.goal}</p></div>
            </div>
            {d.roles ? <p className="sub"><b style={{ color: 'var(--fg)', fontWeight: 600 }}>Роли:</b> {d.roles}</p> : null}
            <div className="who-need">
              {d.lookingFor.map((s) => <span key={s} className={`chip ${groupOf(s) === 'external' ? 'accent' : 'brand'}`}>{SEGMENTS[s].label}</span>)}
            </div>
          </section>

          {d.result ? (
            <section className="card" data-reveal>
              <div className="between"><p className="label">Итоги</p>{d.reportedAt ? <span className="fine">отправлены {fmtDate(d.reportedAt)}</span> : null}</div>
              <div className="result-stats">
                <div><b data-count={d.audienceCount ?? 0}>{d.audienceCount === null ? '—' : fmtNum(d.audienceCount)}</b><span>участников</span></div>
                <div><b data-count={d.reach ?? 0}>{d.reach === null ? '—' : fmtNum(d.reach)}</b><span>охват</span></div>
                <div>
                  <b>{d.audienceScore === null ? '—' : String(d.audienceScore).replace('.', ',')}</b>
                  <span className="stars" aria-label={d.audienceScore === null ? 'нет оценки' : `оценка ${d.audienceScore} из 5`}>
                    {[1, 2, 3, 4, 5].map((n) => <i key={n} className={d.audienceScore !== null && n <= Math.round(d.audienceScore) ? 'on' : ''} style={{ '--i': n } as React.CSSProperties} />)}
                  </span>
                </div>
              </div>
              <p className="text-pre">{d.result}</p>
              {d.resultLink ? <a className="link row" href={d.resultLink} target="_blank" rel="noreferrer"><Icon name="external" size={16} /> Публикация и материалы</a> : null}
            </section>
          ) : null}

          {steps.length ? (
            <section className="card playbook" data-reveal>
              <div className="between"><p className="label">Как повторить</p><span className="chip"><Icon name="library" size={13} /> инструкция автора</span></div>
              <ol className="steps">{steps.map((s, n) => <li key={n}><span>{s}</span></li>)}</ol>
            </section>
          ) : null}

          {d.replicaList.length ? (
            <section className="card" data-reveal>
              <p className="label">Повторили в регионах</p>
              <ul className="replicas">
                {d.replicaList.map((r) => (
                  <li key={r.id}>
                    <Link href={`${base}/${r.id}`} className="replica">
                      <span className="rep-from">{d.regionCity}</span>
                      <span className="rep-line" aria-hidden="true"><i /></span>
                      <span className="rep-to">{r.regionCity}</span>
                      <InitiativeChip status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {below}
        </div>

        <aside className="stack">
          {actions}
          <section className="card" data-reveal>
            <div className="between">
              <p className="label">Команда</p>
              <span className="fine">{accepted.length} из {d.teamSize}</span>
            </div>
            <div className="seats" aria-hidden="true">
              {Array.from({ length: d.teamSize }, (_, i) => {
                const m = accepted[i];
                return <span key={i} className={m ? (groupOf(m.segment) === 'external' ? 'ext' : 'int') : ''} style={{ '--i': i } as React.CSSProperties} />;
              })}
            </div>
            <ul className="list">
              {accepted.map((m) => (
                <li key={m.id} className="member">
                  <Avatar name={m.name} className={`sm ${groupOf(m.segment) === 'external' ? 'alt' : 'soft'}`} />
                  <span className="min0 grow">
                    <b>{m.name}</b>{m.id === d.authorId ? <span className="chip accent" style={{ marginLeft: 6 }}>автор</span> : null}<br />
                    <span className="fine">{m.segment ? SEGMENTS[m.segment].label : ''}{m.regionCity ? ` · ${m.regionCity}` : ''}{m.org ? ` · ${m.org}` : ''}</span>
                  </span>
                </li>
              ))}
            </ul>
            {requests.length && teamActions ? (
              <>
                <p className="label" style={{ marginTop: 6 }}>Отклики · {requests.length}</p>
                <ul className="list">
                  {requests.map((m) => (
                    <li key={m.id} className="request" data-reveal>
                      <div className="member">
                        <Avatar name={m.name} className={`sm ${groupOf(m.segment) === 'external' ? 'alt' : 'soft'}`} />
                        <span className="min0 grow"><b>{m.name}</b><br /><span className="fine">{m.segment ? SEGMENTS[m.segment].label : ''}{m.regionCity ? ` · ${m.regionCity}` : ''}</span></span>
                      </div>
                      {m.note ? <p className="quote">{m.note}</p> : null}
                      {teamActions(m.id)}
                    </li>
                  ))}
                </ul>
              </>
            ) : requests.length ? <p className="fine">{requests.length} {plural(requests.length, 'отклик ждёт', 'отклика ждут', 'откликов ждут')} решения автора</p> : null}
          </section>
          <p className="fine">Создана {fmtDate(d.createdAt)}{d.approvedAt ? ` · согласована ${fmtDate(d.approvedAt)}` : ''}{d.startedAt ? ` · старт ${fmtDate(d.startedAt)}` : ''}</p>
        </aside>
      </div>
    </div>
  );
}
