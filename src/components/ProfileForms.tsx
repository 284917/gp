'use client';

import { useActionState } from 'react';
import { changePassword, updateProfile } from '@/app/actions/me';
import type { FormState } from '@/app/actions/auth';
import { SubmitButton } from './SubmitButton';

function Status({ state }: { state: FormState }) {
  if (state.error) return <div className="alert bad" role="alert"><span>{state.error}</span></div>;
  if (state.ok) return <div className="alert good" role="status"><span>{state.ok}</span></div>;
  return null;
}

export function ProfileForm({ name, phone, org, position, orgLabel, posLabel }: { name: string; phone: string; org: string; position: string; orgLabel: string; posLabel: string }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, {});
  return (
    <form action={action} className="form">
      <Status state={state} />
      <div className="grid-2">
        <div className="field-wrap"><label className="flabel" htmlFor="p-name">Имя и фамилия</label><input id="p-name" name="name" className="field" defaultValue={name} required /></div>
        <div className="field-wrap"><label className="flabel" htmlFor="p-phone">Телефон</label><input id="p-phone" name="phone" type="tel" className="field" defaultValue={phone} /></div>
        <div className="field-wrap"><label className="flabel" htmlFor="p-org">{orgLabel}</label><input id="p-org" name="org" className="field" defaultValue={org} /></div>
        <div className="field-wrap"><label className="flabel" htmlFor="p-pos">{posLabel}</label><input id="p-pos" name="position" className="field" defaultValue={position} /></div>
      </div>
      <div><SubmitButton>Сохранить</SubmitButton></div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="form">
      <Status state={state} />
      <div className="grid-2">
        <div className="field-wrap"><label className="flabel" htmlFor="pw-cur">Текущий пароль</label><input id="pw-cur" name="current" type="password" className="field" autoComplete="current-password" required /></div>
        <div className="field-wrap"><label className="flabel" htmlFor="pw-new">Новый пароль</label><input id="pw-new" name="next" type="password" className="field" autoComplete="new-password" minLength={8} required /></div>
      </div>
      <div><SubmitButton className="btn">Сменить пароль</SubmitButton></div>
    </form>
  );
}
