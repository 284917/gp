'use client';

import { useActionState, useState } from 'react';
import { createInitiative, requestJoin, submitReport } from '@/app/actions/initiatives';
import type { FormState } from '@/app/actions/auth';
import { FORMATS, FORMAT_KEYS, JOINT_TEMPLATES, SEGMENTS, SEGMENT_KEYS, type InitiativeFormat, type Segment } from '@/lib/domain';
import { Icon } from './Icon';
import { SubmitButton } from './SubmitButton';

function Status({ state }: { state: FormState }) {
  if (state.error) return <div className="alert bad shake" role="alert"><Icon name="no" size={18} /><span>{state.error}</span></div>;
  if (state.ok) return <div className="alert good pop" role="status"><Icon name="check" size={18} /><span>{state.ok}</span></div>;
  return null;
}

type Draft = { title: string; format: InitiativeFormat; summary: string; goal: string; roles: string; audience: string; lookingFor: Segment[] };

export function CreateInitiativeForm({ regions, regionId, source }: {
  regions: { id: string; city: string }[];
  regionId: string | null;
  source: (Draft & { id: number; city: string }) | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(createInitiative, {});
  const v = state.values;
  const [draft, setDraft] = useState<Draft>(() => source
    ? { ...source, title: source.title }
    : { title: '', format: 'interview', summary: '', goal: '', roles: '', audience: '', lookingFor: [] });
  const [tpl, setTpl] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const looking = v?.lookingFor !== undefined ? v.lookingFor.split(',').filter(Boolean) : draft.lookingFor;

  const apply = (k: string) => {
    const t = JOINT_TEMPLATES.find((x) => x.key === k);
    if (!t) return;
    setTpl(k);
    setDraft({ title: t.title, format: t.format, summary: t.summary, goal: t.goal, roles: t.roles, audience: '', lookingFor: t.lookingFor });
    setKey((n) => n + 1);
  };

  return (
    <form action={action} className="form">
      {source ? <input type="hidden" name="sourceId" value={source.id} /> : null}
      {!source ? (
        <fieldset className="tpl-pick">
          <legend className="label">Начните с готовой совместной механики или с чистого листа</legend>
          <div className="tpl-grid">
            {JOINT_TEMPLATES.map((t) => (
              <button type="button" key={t.key} className="tpl" aria-pressed={tpl === t.key} onClick={() => apply(t.key)}>
                <Icon name={FORMATS[t.format].icon} size={20} />
                <b>{t.title}</b>
                <span>{t.roles}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="alert"><Icon name="repeat" size={18} /><span>Вы повторяете формат из города {source.city}. Поправьте описание под свою аудиторию: инструкция автора будет на странице проекта.</span></div>
      )}
      <Status state={state} />
      <div className="form" key={key}>
        <div className="field-wrap">
          <label className="flabel" htmlFor="i-title">Название</label>
          <input id="i-title" name="title" className="field" defaultValue={v?.title ?? draft.title} placeholder="Например, «Первый год на АЗС»: серия интервью" required minLength={5} maxLength={140} />
        </div>
        <div className="grid-2">
          <div className="field-wrap">
            <label className="flabel" htmlFor="i-format">Формат</label>
            <select id="i-format" name="format" className="field" defaultValue={v?.format ?? draft.format}>
              {FORMAT_KEYS.map((f) => <option key={f} value={f}>{FORMATS[f].label}</option>)}
            </select>
          </div>
          <div className="field-wrap">
            <label className="flabel" htmlFor="i-region">Регион проекта</label>
            <select id="i-region" name="region" className="field" defaultValue={v?.region ?? regionId ?? ''}>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.city}</option>)}
            </select>
          </div>
        </div>
        <div className="field-wrap">
          <label className="flabel" htmlFor="i-sum">Идея</label>
          <textarea id="i-sum" name="summary" className="field" rows={4} defaultValue={v?.summary ?? draft.summary} placeholder="Что вы хотите сделать, для кого и почему это сработает" required minLength={40} />
        </div>
        <div className="grid-2">
          <div className="field-wrap">
            <label className="flabel" htmlFor="i-aud">Аудитория</label>
            <input id="i-aud" name="audience" className="field" defaultValue={v?.audience ?? draft.audience} placeholder="Студенты 2–3 курса нефтяного колледжа" />
          </div>
          <div className="field-wrap">
            <label className="flabel" htmlFor="i-size">Команда вместе с вами</label>
            <select id="i-size" name="teamSize" className="field" defaultValue={v?.teamSize ?? '4'}>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} человек{n < 5 ? 'а' : ''}</option>)}
            </select>
          </div>
        </div>
        <fieldset className="field-wrap" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="flabel" style={{ marginBottom: 6 }}>Кого ищете</legend>
          <div className="seg-toggles">
            {SEGMENT_KEYS.map((s) => (
              <label key={s} className="seg-toggle">
                <input type="checkbox" name="lookingFor" value={s} defaultChecked={looking.includes(s)} />
                <span>{SEGMENTS[s].label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field-wrap">
          <label className="flabel" htmlFor="i-roles">Роли в команде</label>
          <input id="i-roles" name="roles" className="field" defaultValue={v?.roles ?? draft.roles} placeholder="Кто нужен и чем он займётся" />
        </div>
        <div className="field-wrap">
          <label className="flabel" htmlFor="i-goal">Ожидаемый результат</label>
          <textarea id="i-goal" name="goal" className="field" rows={3} defaultValue={v?.goal ?? draft.goal} placeholder="Что появится в конце: ролики, встреча на 40 человек, инструкция для других регионов" required minLength={20} />
        </div>
        <label className="checkbox">
          <input type="checkbox" name="onSite" defaultChecked={v?.onSite === 'on'} />
          <span>Будем снимать или проводить встречу на АЗС или нефтебазе. Куратор поможет с допуском и согласованием съёмки.</span>
        </label>
      </div>
      <div className="row">
        <SubmitButton className="btn primary large" pendingText="Отправляю…"><Icon name="rocket" size={18} /> Отправить на согласование</SubmitButton>
        <span className="fine">Куратор посмотрит идею, и откроется набор команды.</span>
      </div>
    </form>
  );
}

export function JoinForm({ id }: { id: number }) {
  const [state, action] = useActionState<FormState, FormData>(requestJoin, {});
  if (state.ok) return <Status state={state} />;
  return (
    <form action={action} className="form">
      <input type="hidden" name="id" value={id} />
      <Status state={state} />
      <div className="field-wrap">
        <label className="flabel" htmlFor="j-note">Чем вы поможете проекту</label>
        <textarea id="j-note" name="note" className="field" rows={3} placeholder="Например: снимаю и монтирую ролики, могу договориться с колледжем об аудитории" required minLength={10} />
      </div>
      <div><SubmitButton className="btn primary" pendingText="Отправляю…"><Icon name="users" size={18} /> Хочу в команду</SubmitButton></div>
    </form>
  );
}

export function ReportForm({ id }: { id: number }) {
  const [state, action] = useActionState<FormState, FormData>(submitReport, {});
  const v = state.values;
  if (state.ok) return <Status state={state} />;
  return (
    <form action={action} className="form">
      <input type="hidden" name="id" value={id} />
      <Status state={state} />
      <div className="field-wrap">
        <label className="flabel" htmlFor="r-res">Что получилось</label>
        <textarea id="r-res" name="result" className="field" rows={4} defaultValue={v?.result} placeholder="Кто пришёл, что сделали, какие вопросы задавали, что опубликовали" required minLength={40} />
      </div>
      <div className="field-wrap">
        <label className="flabel" htmlFor="r-play">Как повторить в другом регионе</label>
        <textarea id="r-play" name="playbook" className="field" rows={5} defaultValue={v?.playbook} placeholder={'1. За две недели договоритесь с площадкой\n2. Соберите вопросы у студентов заранее\n3. …'} required minLength={40} />
        <span className="fhint">Эта инструкция попадёт в библиотеку форматов. По ней проект повторят другие команды.</span>
      </div>
      <div className="grid-3">
        <div className="field-wrap"><label className="flabel" htmlFor="r-aud">Участников встречи</label><input id="r-aud" name="audienceCount" inputMode="numeric" className="field" defaultValue={v?.audienceCount} placeholder="38" /></div>
        <div className="field-wrap"><label className="flabel" htmlFor="r-reach">Охват публикаций</label><input id="r-reach" name="reach" inputMode="numeric" className="field" defaultValue={v?.reach} placeholder="4 270" /></div>
        <div className="field-wrap"><label className="flabel" htmlFor="r-score">Оценка аудитории, 1–5</label><input id="r-score" name="audienceScore" inputMode="decimal" className="field" defaultValue={v?.audienceScore} placeholder="4,6" /></div>
      </div>
      <div className="field-wrap">
        <label className="flabel" htmlFor="r-link">Ссылка на публикацию или папку с материалами</label>
        <input id="r-link" name="link" type="url" className="field" defaultValue={v?.link} placeholder="https://" />
      </div>
      <div><SubmitButton className="btn primary large" pendingText="Отправляю…"><Icon name="check" size={18} /> Отправить итоги куратору</SubmitButton></div>
    </form>
  );
}
