import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCurator } from '@/lib/auth';
import { getCommunityStats, listInitiatives, type InitiativeCard } from '@/lib/initiatives';
import { FORMATS, INITIATIVE_STATUS, SEGMENTS, type InitiativeStatus } from '@/lib/domain';
import { Empty, PageHead } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { FormatIcon, InitiativeTile, TeamStack } from '@/components/Initiative';
import { CommunityRings } from '@/components/CommunityRings';
import { SubmitButton } from '@/components/SubmitButton';
import { acceptReport, approveIdea, declineIdea, returnReport } from '@/app/actions/initiatives';

export const metadata: Metadata = { title: 'Инициативы' };

const FILTERS: { key: InitiativeStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'recruiting', label: 'Набор команды' },
  { key: 'active', label: 'В работе' },
  { key: 'done', label: 'Завершены' },
  { key: 'declined', label: 'Не согласованы' },
];

function QueueCard({ i, kind }: { i: InitiativeCard; kind: 'idea' | 'report' }) {
  return (
    <article className="mod" data-reveal>
      <div className="mod-top">
        <FormatIcon format={i.format} />
        <div className="mod-who">
          <Link href={`/curator/initiatives/${i.id}`} className="link" style={{ color: 'var(--fg)' }}>{i.title}</Link>
          <span>{i.authorName} · {i.regionCity} · {FORMATS[i.format].label}</span>
        </div>
      </div>
      <p className="sub" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{kind === 'idea' ? i.summary : i.goal}</p>
      <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
        {kind === 'idea'
          ? i.lookingFor.map((s) => <span key={s} className="chip">{SEGMENTS[s].label}</span>)
          : <><TeamStack team={i.team} /><span className="fine">{i.team.length} в команде</span></>}
        {i.sourceCity ? <span className="chip"><Icon name="repeat" size={13} /> повтор формата из города {i.sourceCity}</span> : null}
      </div>
      <form action={kind === 'idea' ? approveIdea : acceptReport} className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <input type="hidden" name="id" value={i.id} />
        <input name="comment" className="field" placeholder={kind === 'idea' ? 'Комментарий автору, по желанию' : 'Что доработать, если возвращаете'} aria-label="Комментарий" />
        <div className="btns">
          {kind === 'idea' ? (
            <>
              <SubmitButton className="btn small primary" pendingText="…"><Icon name="check" size={16} /> Согласовать</SubmitButton>
              <button type="submit" formAction={declineIdea} className="btn small danger">Отклонить</button>
            </>
          ) : (
            <>
              <SubmitButton className="btn small primary" pendingText="…"><Icon name="trophy" size={16} /> Принять и начислить баллы</SubmitButton>
              <button type="submit" formAction={returnReport} className="btn small">Вернуть</button>
            </>
          )}
        </div>
      </form>
    </article>
  );
}

export default async function CuratorInitiatives({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  await requireCurator();
  const filter = FILTERS.some((f) => f.key === sp.status) ? (sp.status as InitiativeStatus | 'all') : 'all';
  const [ideas, reports, all, s] = await Promise.all([
    listInitiatives({ statuses: ['idea'] }),
    listInitiatives({ statuses: ['reporting'] }),
    listInitiatives({ statuses: filter === 'all' ? ['recruiting', 'active', 'done'] : filter === 'active' ? ['active', 'reporting'] : [filter] }),
    getCommunityStats(),
  ]);

  return (
    <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
      <PageHead title="Инициативы" eyebrow="Проекты, которые предлагают сами амбассадоры"
        sub="Куратор согласует идею и принимает итоги. Команду собирает и ведёт автор." />

      <section className="card" data-reveal>
        <div className="between"><h2 className="h3">Самостоятельность сообщества</h2><span className="fine">{s.members} участников в командах · {s.replicas} повторов форматов</span></div>
        <CommunityRings s={s} />
      </section>

      <section className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <div className="between"><h2 className="h3">Ждут согласования · {ideas.length}</h2></div>
        {ideas.length ? <div className="mod-list">{ideas.map((i) => <QueueCard key={i.id} i={i} kind="idea" />)}</div>
          : <Empty icon="check" title="Новых идей нет">Когда амбассадор предложит проект, он появится здесь.</Empty>}
      </section>

      <section className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <h2 className="h3">Итоги на проверке · {reports.length}</h2>
        {reports.length ? <div className="mod-list">{reports.map((i) => <QueueCard key={i.id} i={i} kind="report" />)}</div>
          : <Empty icon="check" title="Все итоги проверены">Здесь появятся завершённые проекты: проверьте публикации и примите итоги.</Empty>}
      </section>

      <section className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <div className="between">
          <h2 className="h3">Все инициативы</h2>
          <nav className="tabs" aria-label="Статус">
            {FILTERS.map((f) => <Link key={f.key} href={f.key === 'all' ? '/curator/initiatives' : `/curator/initiatives?status=${f.key}`} aria-current={filter === f.key ? 'page' : undefined}>{f.label}</Link>)}
          </nav>
        </div>
        {all.length ? <div className="igrid">{all.map((i, n) => <InitiativeTile key={i.id} i={i} index={n} href={`/curator/initiatives/${i.id}`} />)}</div>
          : <Empty icon="rocket" title={filter === 'all' ? 'Инициатив пока нет' : `Статус «${INITIATIVE_STATUS[filter as InitiativeStatus].label}»: пусто`}>
              Расскажите амбассадорам о бирже: идея на один абзац, команда из сотрудников и студентов.
            </Empty>}
      </section>
    </div>
  );
}
