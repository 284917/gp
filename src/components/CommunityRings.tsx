import { TARGETS } from '@/lib/domain';
import type { getCommunityStats } from '@/lib/initiatives';

type Stats = Awaited<ReturnType<typeof getCommunityStats>>;

const R = 42;
const C = 2 * Math.PI * R;

function Ring({ value, target, title, formula, i }: { value: number; target: number; title: string; formula: string; i: number }) {
  const ok = value >= target;
  return (
    <figure className={`ring ${ok ? 'ok' : ''}`} data-reveal style={{ '--i': i, '--p': Math.min(100, value) / 100, '--t': target / 100 } as React.CSSProperties}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r={R} />
        <circle className="ring-fill" cx="50" cy="50" r={R} strokeDasharray={C} />
        <line className="ring-target" x1="83" y1="50" x2="97" y2="50" style={{ transform: `rotate(${target * 3.6}deg)` }} />
      </svg>
      <span className="ring-v"><b data-count={value} data-suffix="%">{value}%</b><small>цель {target}%</small></span>
      <figcaption><b>{title}</b><span>{formula}</span></figcaption>
    </figure>
  );
}

/** Четыре показателя самостоятельности сообщества: кольца заполняются при появлении. */
export function CommunityRings({ s }: { s: Stats }) {
  return (
    <div className="rings">
      <Ring i={0} value={s.index} target={TARGETS.initiativeIndex} title="Индекс инициативности" formula={`${s.initiators} из ${s.active} активных довели свой проект до конца`} />
      <Ring i={1} value={s.mixedShare} target={TARGETS.mixedTeams} title="Смешанные команды" formula={`${s.mixed} из ${s.done} завершённых: сотрудники и студенты вместе`} />
      <Ring i={2} value={s.replicatedShare} target={TARGETS.replicated} title="Повторённые форматы" formula={`${s.replicated} из ${s.done} завершённых повторили в другом регионе`} />
      <Ring i={3} value={s.retention} target={TARGETS.retention} title="Удержание" formula={s.base ? `${s.retained} из ${s.base} участников со стажем 60+ дней активны за месяц` : 'считаем, когда у участников будет 60 дней в программе'} />
    </div>
  );
}
