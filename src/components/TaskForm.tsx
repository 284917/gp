import { KINDS, KIND_KEYS, SEGMENTS, SEGMENT_KEYS, SUBMIT_LABEL, type Kind, type Segment, type SubmitType } from '@/lib/domain';
import { saveTask } from '@/app/actions/curator';
import { SubmitButton } from './SubmitButton';

export type TaskData = {
  id?: number; title: string; kind: Kind; duration: string; points: number; segments: Segment[]; channel: string; why: string;
  steps: string[]; submitTypes: SubmitType[]; joint: boolean; needsCurator: boolean; active: boolean; sort: number;
};

export const EMPTY_TASK: TaskData = {
  title: '', kind: 'post', duration: '15 мин', points: 60, segments: ['office', 'site'], channel: '', why: '', steps: [],
  submitTypes: ['text', 'file'], joint: false, needsCurator: false, active: true, sort: 0,
};

export function TaskForm({ t }: { t: TaskData }) {
  return (
    <form action={saveTask} className="form card" style={{ padding: 22, maxWidth: 860 }}>
      {t.id ? <input type="hidden" name="id" value={t.id} /> : null}
      <div className="field-wrap">
        <label className="flabel" htmlFor="title">Название</label>
        <input id="title" name="title" className="field" defaultValue={t.title} required placeholder="Например: Кадр смены" />
      </div>
      <div className="grid-3">
        <div className="field-wrap">
          <label className="flabel" htmlFor="kind">Формат</label>
          <select id="kind" name="kind" className="field" defaultValue={t.kind}>
            {KIND_KEYS.map((k) => <option key={k} value={k}>{KINDS[k].label}</option>)}
          </select>
        </div>
        <div className="field-wrap">
          <label className="flabel" htmlFor="duration">Сколько времени</label>
          <input id="duration" name="duration" className="field" defaultValue={t.duration} placeholder="10 мин" />
        </div>
        <div className="field-wrap">
          <label className="flabel" htmlFor="points">Баллы</label>
          <input id="points" name="points" type="number" min={1} max={1000} className="field" defaultValue={t.points} required />
        </div>
      </div>
      <fieldset className="field-wrap" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="flabel" style={{ marginBottom: 6 }}>Для кого</legend>
        <div className="checks">
          {SEGMENT_KEYS.map((k) => (
            <label key={k} className="checkbox"><input type="checkbox" name="segments" value={k} defaultChecked={t.segments.includes(k)} /><span>{SEGMENTS[k].label}</span></label>
          ))}
        </div>
      </fieldset>
      <div className="field-wrap">
        <label className="flabel" htmlFor="why">Зачем это задание</label>
        <textarea id="why" name="why" className="field" rows={2} defaultValue={t.why} placeholder="Одно-два предложения: какую пользу даёт задание" />
      </div>
      <div className="field-wrap">
        <label className="flabel" htmlFor="steps">Как сделать</label>
        <textarea id="steps" name="steps" className="field" rows={4} defaultValue={t.steps.join('\n')} placeholder={'Каждый шаг с новой строки'} />
        <span className="fhint">Каждый шаг с новой строки.</span>
      </div>
      <div className="field-wrap">
        <label className="flabel" htmlFor="channel">Где публикуется</label>
        <input id="channel" name="channel" className="field" defaultValue={t.channel} placeholder="Корпоративный канал в VK" />
      </div>
      <fieldset className="field-wrap" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="flabel" style={{ marginBottom: 6 }}>Как сдавать</legend>
        <div className="checks">
          {(['text', 'link', 'file'] as SubmitType[]).map((k) => (
            <label key={k} className="checkbox"><input type="checkbox" name="submitTypes" value={k} defaultChecked={t.submitTypes.includes(k)} /><span>{SUBMIT_LABEL[k]}</span></label>
          ))}
        </div>
      </fieldset>
      <div className="checks">
        <label className="checkbox"><input type="checkbox" name="joint" defaultChecked={t.joint} /><span>Выполняется с тандемом</span></label>
        <label className="checkbox"><input type="checkbox" name="needsCurator" defaultChecked={t.needsCurator} /><span>Проверяет куратор (съёмка на объекте, внешняя публикация)</span></label>
        <label className="checkbox"><input type="checkbox" name="active" defaultChecked={t.active} /><span>Опубликовано</span></label>
      </div>
      <div className="field-wrap" style={{ maxWidth: 200 }}>
        <label className="flabel" htmlFor="sort">Порядок в списке</label>
        <input id="sort" name="sort" type="number" className="field" defaultValue={t.sort} />
      </div>
      <div><SubmitButton>{t.id ? 'Сохранить задание' : 'Опубликовать задание'}</SubmitButton></div>
    </form>
  );
}
