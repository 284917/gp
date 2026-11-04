import Link from 'next/link';
import { Icon } from './Icon';
import { LEVELS, groupOf, type Segment } from '@/lib/domain';
import { plural } from '@/lib/format';

/** С какого уровня студенту открываются карьерные форматы в каталоге наград. */
const CAREER_FROM = 2;

/**
 * Карьерная поддержка вместо привилегий.
 * Студентам программа не даёт преимущества при отборе на практику — помогает к нему подготовиться.
 * Сотрудникам — статус автора формата.
 */
export function CareerCard({ segment, level, done, authored }: { segment: Segment | null; level: number; done: number; authored: number }) {
  if (groupOf(segment) === 'external') {
    const open = level >= CAREER_FROM;
    const items = [
      { title: 'Карьерная консультация с HR', hint: 'резюме, сильные стороны, план на практику' },
      { title: 'Встречи с экспертами компании', hint: 'разговор с профессионалом о будущей работе' },
      { title: 'Подготовка к отбору на практику', hint: 'как устроен отбор и пробное собеседование' },
    ];
    return (
      <section className={`status-card ${open ? 'earned' : ''}`} data-reveal>
        <span className="status-medal" aria-hidden="true"><Icon name="star" size={26} /></span>
        <div className="min0 grow stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <p className="label">Карьера</p>
          <h2 className="h3">Карьерная поддержка</h2>
          <p className="sub">{open
            ? 'Преимуществ при отборе на практику программа не даёт — он проходит на общих условиях. Зато к нему можно подготовиться вместе с нами.'
            : `Карьерные форматы откроются с уровня «${LEVELS[CAREER_FROM - 1].name}». Преимуществ при отборе программа не даёт — она помогает подготовиться.`}</p>
          <ul className="status-steps">
            {items.map((s) => (
              <li key={s.title} className={open ? 'ok' : ''}>
                <span className="tick"><Icon name={open ? 'check' : 'lock'} size={14} /></span>
                <span><b>{s.title}</b><small>{s.hint}</small></span>
              </li>
            ))}
          </ul>
        </div>
        {open
          ? <Link href={`/me/rewards?cat=${encodeURIComponent('Карьера')}`} className="btn primary"><Icon name="star" size={16} /> Выбрать формат</Link>
          : <Link href="/me/tasks" className="btn primary"><Icon name="tasks" size={16} /> К заданиям</Link>}
      </section>
    );
  }
  return (
    <section className={`status-card ${authored ? 'earned' : ''}`} data-reveal>
      <span className="status-medal" aria-hidden="true"><Icon name={authored ? 'trophy' : 'idea'} size={26} /></span>
      <div className="min0 grow stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <p className="label">Статус сезона</p>
        <h2 className="h3">{authored ? 'Автор формата' : 'Станьте автором формата'}</h2>
        <p className="sub">{authored
          ? `${authored} ${plural(authored, 'ваш проект', 'ваших проекта', 'ваших проектов')} в библиотеке форматов. Авторы лучших инициатив представляют их на форуме амбассадоров, а вклад попадает в карьерный профиль.`
          : 'Доведите свою инициативу до результата: проект попадёт в библиотеку, его повторят другие регионы, а вклад будет записан в карьерный профиль.'}</p>
        {done && !authored ? <p className="fine">Вы участвовали в {done} {plural(done, 'завершённой инициативе', 'завершённых инициативах', 'завершённых инициативах')}.</p> : null}
      </div>
      {!authored ? <Link href="/me/initiatives/new" className="btn primary"><Icon name="idea" size={16} /> Предложить</Link> : null}
    </section>
  );
}
