import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAmbassador } from '@/lib/auth';
import { db } from '@/lib/db';
import { getCommunityStats, listInitiatives } from '@/lib/initiatives';
import { FORMATS, FORMAT_KEYS, type InitiativeFormat } from '@/lib/domain';
import { Icon } from '@/components/Icon';
import { HubTabs } from '@/components/HubTabs';
import { InitiativeTile } from '@/components/Initiative';
import { RegionFlow, type FlowRegion } from '@/components/RegionFlow';

export const metadata: Metadata = { title: 'Библиотека форматов' };

export default async function FormatsPage({ searchParams }: { searchParams: Promise<{ format?: string }> }) {
  const sp = await searchParams;
  await requireAmbassador();
  const format = FORMAT_KEYS.includes(sp.format as InitiativeFormat) ? (sp.format as InitiativeFormat) : null;
  const [items, regions, stats] = await Promise.all([
    listInitiatives({ statuses: ['done'], format }),
    db()<FlowRegion[]>`select id, city, lon, lat from regions order by sort`,
    getCommunityStats(),
  ]);
  const sorted = [...items].sort((a, b) => b.replicas - a.replicas);

  return (
    <div className="stack" style={{ '--gap': '22px' } as React.CSSProperties}>
      <header className="page-head" data-reveal>
        <div className="stack">
          <p className="eyebrow">Проверенные проекты амбассадоров</p>
          <h1 className="h1">Библиотека форматов</h1>
          <p className="sub">Каждый формат — завершённая инициатива с итогами и инструкцией. Возьмите его и проведите у себя: не нужно придумывать с нуля.</p>
        </div>
      </header>

      <HubTabs />

      <section className="card flow-card" data-reveal>
        <div className="between">
          <div>
            <p className="label">Как форматы расходятся по стране</p>
            <p className="big"><span data-count={stats.replicas}>{stats.replicas}</span> <span className="sub" style={{ fontWeight: 500 }}>повторов в других регионах</span></p>
          </div>
          <span className="chip brand"><Icon name="pin" size={13} /> кураторы в Санкт-Петербурге</span>
        </div>
        <div className="chart-wrap">
          <RegionFlow regions={regions} flows={stats.flows} label={`Повторы форматов между регионами: ${stats.flows.length}`} />
        </div>
        {!stats.flows.length ? <p className="fine">Дуги появятся, когда формат из одного региона повторят в другом.</p> : null}
      </section>

      <nav className="tabs" aria-label="Форматы">
        <Link href="/me/formats" aria-current={!format ? 'page' : undefined}>Все</Link>
        {FORMAT_KEYS.map((f) => <Link key={f} href={`/me/formats?format=${f}`} aria-current={format === f ? 'page' : undefined}>{FORMATS[f].label}</Link>)}
      </nav>

      {sorted.length ? (
        <div className="igrid">
          {sorted.map((i, n) => <InitiativeTile key={i.id} i={i} index={n} href={`/me/initiatives/${i.id}`} />)}
        </div>
      ) : (
        <div className="empty-hero" data-reveal>
          <span className="empty-ic"><Icon name="library" size={30} /></span>
          <h2 className="h3">{format ? 'Таких форматов пока нет' : 'Библиотека ждёт первый формат'}</h2>
          <p className="sub">Сюда попадают завершённые инициативы с инструкцией. Запустите проект на бирже, и через пару недель его смогут повторить в других городах.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link href="/me/initiatives/new" className="btn primary"><Icon name="idea" size={18} /> Предложить инициативу</Link>
          </div>
        </div>
      )}
    </div>
  );
}
