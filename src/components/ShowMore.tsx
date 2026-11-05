'use client';

import { useState } from 'react';

/** На телефоне показывает первые 6 карточек и кнопку «Показать ещё», на компьютере — все сразу. */
export function ShowMore({ total, className = 'igrid', children }: { total: number; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const rest = total - 6;
  return (
    <>
      <div className={`${className}${open || rest <= 0 ? '' : ' clamp-m'}`}>{children}</div>
      {!open && rest > 0 ? (
        <button type="button" className="btn wide show-more" onClick={() => setOpen(true)}>Показать ещё {rest}</button>
      ) : null}
    </>
  );
}
