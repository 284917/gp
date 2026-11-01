'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { join, login, type FormState } from '@/app/actions/auth';
import { SEGMENTS, SEGMENT_KEYS, type Segment } from '@/lib/domain';
import { SubmitButton } from './SubmitButton';

function ErrorLine({ state }: { state: FormState }) {
  if (!state.error) return null;
  return <div className="alert bad" role="alert"><span>{state.error}</span></div>;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, {});
  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="next" value={next ?? ''} />
      <ErrorLine state={state} />
      <div className="field-wrap">
        <label className="flabel" htmlFor="email">Почта</label>
        <input id="email" name="email" type="email" className="field" autoComplete="email" required defaultValue={state.values?.email} />
      </div>
      <div className="field-wrap">
        <label className="flabel" htmlFor="password">Пароль</label>
        <input id="password" name="password" type="password" className="field" autoComplete="current-password" required />
      </div>
      <SubmitButton className="btn primary large wide" pendingText="Входим…">Войти</SubmitButton>
      <p className="sub">Ещё не в программе? <Link className="link" href="/join">Подать заявку</Link></p>
    </form>
  );
}

export function JoinForm({ regions }: { regions: { id: string; name: string }[] }) {
  const [state, action] = useActionState(join, {});
  const v = state.values ?? {};
  const [segment, setSegment] = useState<Segment | ''>((v.segment as Segment) || '');
  const meta = segment ? SEGMENTS[segment] : null;
  return (
    <form action={action} className="form" noValidate>
      <ErrorLine state={state} />
      <fieldset className="form" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="flabel" style={{ marginBottom: 8 }}>Кто вы в программе</legend>
        <div className="seg-cards">
          {SEGMENT_KEYS.map((k) => (
            <label key={k} className="seg-card">
              <input type="radio" name="segment" value={k} checked={segment === k} onChange={() => setSegment(k)} required />
              <b>{SEGMENTS[k].label}</b>
              <span>{SEGMENTS[k].hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid-2">
        <div className="field-wrap">
          <label className="flabel" htmlFor="name">Имя и фамилия</label>
          <input id="name" name="name" className="field" autoComplete="name" required defaultValue={v.name} />
        </div>
        <div className="field-wrap">
          <label className="flabel" htmlFor="region">Регион</label>
          <select id="region" name="region" className="field" required defaultValue={v.region ?? ''}>
            <option value="" disabled>Выберите регион</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="field-wrap">
          <label className="flabel" htmlFor="org">{meta?.orgLabel ?? 'Место работы или учёбы'}</label>
          <input id="org" name="org" className="field" required placeholder={meta?.orgPlaceholder} defaultValue={v.org} />
        </div>
        <div className="field-wrap">
          <label className="flabel" htmlFor="position">{meta?.posLabel ?? 'Должность или курс'}</label>
          <input id="position" name="position" className="field" placeholder={meta?.posPlaceholder} defaultValue={v.position} />
        </div>
        <div className="field-wrap">
          <label className="flabel" htmlFor="email">Почта</label>
          <input id="email" name="email" type="email" className="field" autoComplete="email" required defaultValue={v.email} />
        </div>
        <div className="field-wrap">
          <label className="flabel" htmlFor="phone">Телефон <span className="fhint">необязательно</span></label>
          <input id="phone" name="phone" type="tel" className="field" autoComplete="tel" defaultValue={v.phone} />
        </div>
      </div>
      <div className="field-wrap">
        <label className="flabel" htmlFor="password">Пароль</label>
        <input id="password" name="password" type="password" className="field" autoComplete="new-password" minLength={8} required />
        <span className="fhint">Не короче 8 символов.</span>
      </div>
      <div className="field-wrap">
        <label className="flabel" htmlFor="motivation">Почему вы хотите стать амбассадором</label>
        <textarea id="motivation" name="motivation" className="field" rows={4} required defaultValue={v.motivation}
          placeholder="Пара предложений: о чём хотите рассказывать и чем можете помочь программе" />
      </div>
      {segment === 'college' ? (
        <div className="alert warn"><span>Если вам ещё нет 18 лет, для съёмок и выездов понадобится согласие родителей — куратор пришлёт форму.</span></div>
      ) : null}
      <label className="checkbox">
        <input type="checkbox" name="consent" required />
        <span>Согласен(на) на обработку персональных данных для участия в программе амбассадоров.</span>
      </label>
      <SubmitButton className="btn primary large wide" pendingText="Отправляем…">Отправить заявку</SubmitButton>
      <p className="sub">Уже в программе? <Link className="link" href="/login">Войти</Link></p>
    </form>
  );
}
