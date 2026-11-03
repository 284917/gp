import Link from 'next/link';
import { Icon } from './Icon';
import { LEVELS, PRIORITY_RULE, practicePriority, type Segment } from '@/lib/domain';
import { plural } from '@/lib/format';

/**
 * Статус за вклад, а не товар за баллы.
 * Студентам — приоритет при отборе на практику, сотрудникам — статус автора формата.
 */
export function PriorityCard({ segment, points, done, authored }: { segment: Segment | null; points: number; done: number; authored: number }) {
  const p = practicePriority(segment, points, done);
  if (p.applies) {
    const steps = [
      { ok: p.levelOk, text: `Уровень «${LEVELS[PRIORITY_RULE.minLevel - 1].name}»`, hint: 'баллы за задания и инициативы' },
      { ok: p.initiativeOk, text: 'Участие в завершённой инициативе', hint: done ? `завершено: ${done}` : 'автором или в команде' },
    ];
    const got = steps.filter((s) => s.ok).length;
    return (
      <section className={`status-card ${p.earned ? 'earned' : ''}`} data-reveal>
        <span className="status-medal" aria-hidden="true"><Icon name={p.earned ? 'trophy' : 'star'} size={26} /></span>
        <div className="min0 grow stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <p className="label">Статус сезона</p>
          <h2 className="h3">{p.earned ? 'Приоритет при отборе на практику' : 'Путь к приоритету на практику'}</h2>
          <p className="sub">{p.earned
            ? 'Вы в списке приоритетных кандидатов на практику и стажировку. Куратор передаст его команде подбора перед весенним отбором.'
            : 'Приоритет не покупается за баллы. Его получают студенты, которые растут в программе и доводят проекты до результата.'}</p>
          <ul className="status-steps">
            {steps.map((s) => (
              <li key={s.text} className={s.ok ? 'ok' : ''}>
                <span className="tick"><Icon name={s.ok ? 'check' : 'lock'} size={14} /></span>
                <span><b>{s.text}</b><small>{s.hint}</small></span>
              </li>
            ))}
          </ul>
          <div className="status-bar" aria-hidden="true"><span style={{ '--p': got / steps.length } as React.CSSProperties} /></div>
        </div>
        {!p.initiativeOk ? <Link href="/me/initiatives" className="btn primary"><Icon name="rocket" size={16} /> К инициативам</Link> : null}
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
