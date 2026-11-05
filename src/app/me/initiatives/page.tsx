import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAmbassador } from '@/lib/auth';
import { listInitiatives } from '@/lib/initiatives';
import { db } from '@/lib/db';
import { INITIATIVE_POINTS, SEGMENTS } from '@/lib/domain';
import { Empty } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ShowMore } from '@/components/ShowMore';
import { InitiativeTile } from '@/components/Initiative';
import { HubTabs } from '@/components/HubTabs';

export const metadata: Metadata = { title: 'Биржа инициатив' };

const VIEWS = [
  { key: 'all', label: 'Все открытые' },
  { key: 'region', label: 'Мой регион' },
  { key: 'me', label: 'Ищут меня' },
  { key: 'mine', label: 'Мои' },
] as const;
type View = (typeof VIEWS)[number]['key'];

export default async function InitiativesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const u = await requireAmbassador();
  const view: View = VIEWS.some((v) => v.key === sp.view) ? (sp.view as View) : 'all';
  const items = await listInitiatives(
    view === 'mine'
      ? { statuses: ['idea', 'recruiting', 'active', 'reporting', 'done', 'declined'], memberId: u.id }
      : { statuses: ['recruiting', 'active', 'reporting'], regionId: view === 'region' ? u.regionId : null, segment: view === 'me' ? u.segment : null },
  );
  const [c] = await db()<{ open: number; working: number; done: number; regions: number }[]>`
    select count(*) filter (where status = 'recruiting')::int as open,
      count(*) filter (where status in ('active', 'reporting'))::int as working,
      count(*) filter (where status = 'done')::int as done,
      count(distinct region_id) filter (where status not in ('idea', 'declined'))::int as regions
    from initiatives`;

  return (
    <div className="stack" style={{ '--gap': '22px' } as React.CSSProperties}>
      <section className="hub-hero" data-reveal>
        <div className="hub-hero-text">
          <p className="eyebrow on-dark">Инициативы амбассадоров</p>
          <h1 className="h1">Придумайте проект.<br />Соберите команду.</h1>
          <p className="hub-lead">Любой амбассадор может предложить идею, найти соавторов среди сотрудников и студентов и запустить её в своём регионе. Лучшие проекты становятся форматами, которые повторяют по всей стране.</p>
          <div className="row" style={{ '--gap': '12px' } as React.CSSProperties}>
            <Link href="/me/initiatives/new" className="btn accent large"><Icon name="idea" size={18} /> Предложить инициативу</Link>
            <Link href="/me/formats" className="btn ghost-light large"><Icon name="library" size={18} /> Библиотека форматов</Link>
          </div>
        </div>
        <dl className="hub-stats">
          <div><dt>ищут команду</dt><dd data-count={c.open}>{c.open}</dd></div>
          <div><dt>в работе</dt><dd data-count={c.working}>{c.working}</dd></div>
          <div><dt>завершено</dt><dd data-count={c.done}>{c.done}</dd></div>
          <div><dt>регионов</dt><dd data-count={c.regions}>{c.regions}</dd></div>
        </dl>
        <svg className="hub-orbits" viewBox="0 0 400 400" aria-hidden="true">
          <circle cx="200" cy="200" r="70" /><circle cx="200" cy="200" r="120" /><circle cx="200" cy="200" r="170" />
          <g className="orb o1"><circle cx="200" cy="30" r="6" /></g>
          <g className="orb o2"><circle cx="200" cy="80" r="5" /></g>
          <g className="orb o3"><circle cx="200" cy="130" r="4" /></g>
        </svg>
      </section>

      <HubTabs />

      <ul className="points-strip" data-reveal>
        <li><b>+{INITIATIVE_POINTS.author}</b><span>автору завершённой инициативы</span></li>
        <li><b>+{INITIATIVE_POINTS.member}</b><span>каждому в команде</span></li>
        <li><b>+{INITIATIVE_POINTS.mixed}</b><span>всем, если в команде сотрудники и студенты</span></li>
        <li><b>+{INITIATIVE_POINTS.replicated}</b><span>автору, когда формат повторили в другом регионе</span></li>
      </ul>

      <nav className="tabs" aria-label="Фильтр инициатив">
        {VIEWS.map((v) => (
          <Link key={v.key} href={v.key === 'all' ? '/me/initiatives' : `/me/initiatives?view=${v.key}`} aria-current={view === v.key ? 'page' : undefined}>
            {v.key === 'me' && u.segment ? `Ищут ${SEGMENTS[u.segment].whom}` : v.key === 'region' ? `Мой регион · ${u.regionCity ?? ''}` : v.label}
          </Link>
        ))}
      </nav>

      {items.length ? (
        <ShowMore total={items.length}>
          {items.map((i, n) => <InitiativeTile key={i.id} i={i} index={n} href={`/me/initiatives/${i.id}`} />)}
        </ShowMore>
      ) : (
        <div className="empty-hero" data-reveal>
          <span className="empty-ic"><Icon name="sparkle" size={30} /></span>
          <h2 className="h3">{view === 'mine' ? 'Вы пока не участвуете в инициативах' : 'Здесь появятся проекты амбассадоров'}</h2>
          <p className="sub">{view === 'mine'
            ? 'Предложите свою идею или откликнитесь на чужую: так появляется команда из сотрудников и студентов.'
            : 'Станьте первым: идея на один абзац, куратор её согласует, и начнётся набор команды.'}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link href="/me/initiatives/new" className="btn primary"><Icon name="idea" size={18} /> Предложить инициативу</Link>
            <Link href="/me/formats" className="btn"><Icon name="library" size={18} /> Взять готовый формат</Link>
          </div>
        </div>
      )}
    </div>
  );
}
