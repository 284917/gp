'use client';

import { useActionState, useState } from 'react';
import { askCurator, resetPassword, type ResetState } from '@/app/actions/support';
import type { FormState } from '@/app/actions/auth';
import { QUESTION_TOPICS, type QuestionTopic } from '@/lib/support';
import { Icon } from './Icon';
import { SubmitButton } from './SubmitButton';

/** Кнопка «Сбросить пароль» в карточке участника: временный пароль показывается куратору один раз. */
export function ResetPasswordForm({ id, temp }: { id: number; temp: boolean }) {
  const [state, action] = useActionState<ResetState, FormData>(resetPassword, {});
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* пароль виден на экране, его можно выделить вручную */ }
  }

  if (state.password) {
    return (
      <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
        <p className="sub">Временный пароль для <b>{state.email}</b>:</p>
        <div className="temp-pw">
          <code>{state.password}</code>
          <button type="button" className="btn small" onClick={() => copy(state.password!)}>
            <Icon name={copied ? 'check' : 'copy'} size={15} /> {copied ? 'Скопирован' : 'Скопировать'}
          </button>
        </div>
        <p className="fine">Пароль показан один раз. Передайте его участнику лично или в мессенджере: при входе кабинет попросит задать свой пароль. Участник также получил уведомление.</p>
      </div>
    );
  }

  return (
    <form action={action} className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
      <p className="sub">Если участник забыл пароль, выдайте временный. Старый пароль перестанет работать.</p>
      {temp ? <p className="fine">Участник ещё не сменил прошлый временный пароль.</p> : null}
      {state.error ? <div className="alert bad" role="alert"><span>{state.error}</span></div> : null}
      <input type="hidden" name="id" value={id} />
      {asking ? (
        <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
          <SubmitButton className="btn small primary" pendingText="Сбрасываю…">Да, выдать временный пароль</SubmitButton>
          <button type="button" className="btn small ghost" onClick={() => setAsking(false)}>Отмена</button>
        </div>
      ) : (
        <div><button type="button" className="btn small" onClick={() => setAsking(true)}><Icon name="lock" size={15} /> Сбросить пароль</button></div>
      )}
    </form>
  );
}

/** Форма вопроса куратору. Вошедшему участнику не нужно вводить имя и почту. */
export function HelpForm({ topic, user }: { topic: QuestionTopic; user: { name: string; email: string } | null }) {
  const [state, action] = useActionState<FormState, FormData>(askCurator, {});
  const v = state.values ?? {};
  const [current, setCurrent] = useState<string>(v.topic || topic);

  if (state.ok) {
    return (
      <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <div className="alert good" role="status"><Icon name="check" size={18} /><span>{state.ok}</span></div>
      </div>
    );
  }

  return (
    <form action={action} className="form">
      {state.error ? <div className="alert bad" role="alert"><span>{state.error}</span></div> : null}
      {user ? (
        <p className="sub">Вы пишете как <b>{user.name}</b> · {user.email}</p>
      ) : (
        <div className="grid-2">
          <div className="field-wrap"><label className="flabel" htmlFor="q-name">Имя и фамилия</label><input id="q-name" name="name" className="field" defaultValue={v.name} autoComplete="name" required /></div>
          <div className="field-wrap"><label className="flabel" htmlFor="q-email">Почта для ответа</label><input id="q-email" name="email" type="email" className="field" defaultValue={v.email} autoComplete="email" required /></div>
        </div>
      )}
      <div className="field-wrap">
        <label className="flabel" htmlFor="q-topic">Тема</label>
        <select id="q-topic" name="topic" className="field" value={current} onChange={(e) => setCurrent(e.target.value)}>
          {(Object.keys(QUESTION_TOPICS) as QuestionTopic[]).map((k) => <option key={k} value={k}>{QUESTION_TOPICS[k]}</option>)}
        </select>
        {current === 'access' && !user ? <p className="fine">Укажите почту, с которой подавали заявку: куратор выдаст временный пароль.</p> : null}
      </div>
      <div className="field-wrap">
        <label className="flabel" htmlFor="q-body">Вопрос</label>
        <textarea id="q-body" name="body" className="field" rows={5} defaultValue={v.body} minLength={10} maxLength={3000} required
          placeholder={current === 'access' ? 'Например: не помню пароль, вхожу с почтой name@mail.ru' : 'Что случилось или что хотите узнать'} />
      </div>
      <div className="hp" aria-hidden="true"><label>Сайт<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div><SubmitButton pendingText="Отправляю…">Отправить куратору</SubmitButton></div>
    </form>
  );
}
