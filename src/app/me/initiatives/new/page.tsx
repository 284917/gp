import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAmbassador } from '@/lib/auth';
import { db } from '@/lib/db';
import { getInitiative } from '@/lib/initiatives';
import { INITIATIVE_POINTS } from '@/lib/domain';
import { PageHead } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { CreateInitiativeForm } from '@/components/InitiativeForms';

export const metadata: Metadata = { title: 'Новая инициатива' };

export default async function NewInitiativePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const sp = await searchParams;
  const u = await requireAmbassador();
  const regions = await db()<{ id: string; city: string }[]>`select id, city from regions order by sort`;
  const src = sp.from ? await getInitiative(Number(sp.from)) : null;
  const source = src && src.status === 'done'
    ? { id: src.id, city: src.regionCity, title: src.title, format: src.format, summary: src.summary, goal: src.goal, roles: src.roles, audience: src.audience, lookingFor: src.lookingFor }
    : null;

  return (
    <>
      <Link href={source ? `/me/initiatives/${source.id}` : '/me/initiatives'} className="link row back-link"><Icon name="back" size={16} /> {source ? 'К формату' : 'К бирже'}</Link>
      <PageHead
        eyebrow={source ? `Повтор формата · ${source.city} → ${u.regionCity ?? 'ваш регион'}` : 'Новая инициатива'}
        title={source ? 'Повторить в моём регионе' : 'Предложить инициативу'}
        sub="Опишите идею так, чтобы в команду захотели прийти и сотрудники, и студенты." />
      <div className="grid-main">
        <section className="card" data-reveal style={{ padding: 22 }}>
          <CreateInitiativeForm regions={regions} regionId={u.regionId} source={source} />
        </section>
        <aside className="stack">
          <section className="card path-card" data-reveal>
            <p className="label">Что будет дальше</p>
            <ol className="vpath">
              <li><b>Согласование</b><span>Куратор смотрит идею за пару дней. Если нужна съёмка на объекте, поможет с допуском.</span></li>
              <li><b>Набор команды</b><span>Проект появится на бирже. Вы сами выбираете, кого взять из откликнувшихся.</span></li>
              <li><b>Работа</b><span>Команда делает проект. Публикации перед выходом смотрит куратор.</span></li>
              <li><b>Итоги и формат</b><span>Вы описываете результат и инструкцию. Проект попадает в библиотеку, и его повторяют другие регионы.</span></li>
            </ol>
          </section>
          <section className="card" data-reveal>
            <p className="label">Баллы за вклад</p>
            <ul className="list" style={{ fontSize: 14 }}>
              <li className="between"><span>Автору</span><span className="pts">+{INITIATIVE_POINTS.author}</span></li>
              <li className="between"><span>Каждому в команде</span><span className="pts">+{INITIATIVE_POINTS.member}</span></li>
              <li className="between"><span>Смешанной команде</span><span className="pts">+{INITIATIVE_POINTS.mixed}</span></li>
              <li className="between"><span>Когда формат повторят</span><span className="pts">+{INITIATIVE_POINTS.replicated}</span></li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
