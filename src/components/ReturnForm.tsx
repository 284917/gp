'use client';

import { useState } from 'react';
import { returnSubmission } from '@/app/actions/review';
import { SubmitButton } from './SubmitButton';

export function ReturnForm({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return <button type="button" className="btn small" onClick={() => setOpen(true)}>Вернуть на доработку</button>;
  }
  return (
    <form action={returnSubmission} className="form" style={{ width: '100%', gap: 8 }}>
      <input type="hidden" name="id" value={id} />
      <label className="flabel" htmlFor={`ret-${id}`}>Что поправить</label>
      <textarea id={`ret-${id}`} name="comment" className="field" rows={2} required autoFocus placeholder="Например: уберите из кадра номер машины" />
      <div className="btns">
        <SubmitButton className="btn small primary" pendingText="Отправляю…">Вернуть с комментарием</SubmitButton>
        <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>Отмена</button>
      </div>
    </form>
  );
}
