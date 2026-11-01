'use client';

import { useMemo, useRef, useState } from 'react';
import { BUILDER_EXAMPLES, CHANNELS, HOOKS, MESSAGES, RULES, SCRIPTS } from '@/lib/kit';
import { groupOf, type Segment } from '@/lib/domain';
import { Icon } from './Icon';

const SECTIONS = [
  ['builder', 'Конструктор поста'],
  ['messages', 'Ключевые сообщения'],
  ['scripts', 'Сценарии роликов'],
  ['rules', 'Можно и нельзя'],
  ['channels', 'Каналы'],
] as const;
type Section = (typeof SECTIONS)[number][0];
type Format = 'post' | 'photo' | 'script';

function build(segment: Segment, who: string, what: string, why: string, format: Format) {
  const w = who.trim().replace(/[.!?]+$/, '');
  const a = what.trim();
  const b = why.trim();
  if (format === 'photo') return `${b}\n\n${w}\n#ГолосКомпании`;
  if (format === 'script') return `0–3 с · крупный план, фраза в кадр:\n«${b}»\n\n3–18 с · вы в кадре:\n${w}. ${a}\n\n18–26 с · общий план места (только разрешённая зона)\n\n26–30 с · титр: #ГолосКомпании`;
  return `${HOOKS[segment]}\n\n${w}.\n\n${a}\n\n${b}\n\nА у вас был похожий случай?\n#ГолосКомпании`;
}

export function KitView({ segment }: { segment: Segment }) {
  const [section, setSection] = useState<Section>('builder');
  const ex = BUILDER_EXAMPLES[segment];
  const [who, setWho] = useState(ex.who);
  const [what, setWhat] = useState(ex.what);
  const [why, setWhy] = useState(ex.why);
  const [format, setFormat] = useState<Format>('post');
  const [copied, setCopied] = useState('');
  const [checks, setChecks] = useState<boolean[]>(RULES.checklist.map(() => false));
  const outRef = useRef<HTMLPreElement>(null);
  const text = useMemo(() => build(segment, who, what, why, format), [segment, who, what, why, format]);
  const group = groupOf(segment);
  const scripts = [...SCRIPTS].sort((x, y) => Number(y.for.includes(segment)) - Number(x.for.includes(segment)));

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('Текст скопирован');
    } catch {
      const r = document.createRange();
      if (outRef.current) { r.selectNodeContents(outRef.current); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); }
      setCopied('Текст выделен — скопируйте его');
    }
    setTimeout(() => setCopied(''), 2500);
  }

  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <div className="tabs" role="group" aria-label="Разделы кита">
        {SECTIONS.map(([k, l]) => <button key={k} type="button" aria-pressed={section === k} onClick={() => setSection(k)}>{l}</button>)}
      </div>

      {section === 'builder' ? (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <section className="card form">
            <p className="sub">Три ответа — и черновик готов. Капитан поправит текст перед публикацией.</p>
            <div className="field-wrap"><label className="flabel" htmlFor="k-who">Кто вы</label><input id="k-who" className="field" value={who} onChange={(e) => setWho(e.target.value)} /></div>
            <div className="field-wrap"><label className="flabel" htmlFor="k-what">Что произошло: один конкретный случай</label><textarea id="k-what" className="field" rows={4} value={what} onChange={(e) => setWhat(e.target.value)} /></div>
            <div className="field-wrap"><label className="flabel" htmlFor="k-why">Что это говорит о работе</label><textarea id="k-why" className="field" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} /></div>
            <div className="tabs" role="group" aria-label="Формат">
              {([['post', 'Пост'], ['photo', 'Подпись к фото'], ['script', 'Сценарий 30 с']] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={format === k} onClick={() => setFormat(k)}>{l}</button>
              ))}
            </div>
          </section>
          <section className="card">
            <div className="between"><p className="label">Черновик</p><span className="fine num">{text.length} знаков</span></div>
            <pre ref={outRef} className="kit-out">{text}</pre>
            <div className="row">
              <button type="button" className="btn small" onClick={copy}><Icon name="copy" size={16} /> Скопировать</button>
              {copied ? <span className="fine" role="status">{copied}</span> : null}
            </div>
          </section>
        </div>
      ) : null}

      {section === 'messages' ? (
        <div className="grid-2">
          {MESSAGES.map((m) => (
            <section key={m.title} className="card">
              <h3 className="h3">{m.title}</h3>
              <p style={{ fontWeight: 600 }}>{m.main}</p>
              <p className="sub"><b>{group === 'internal' ? 'Как рассказать сотруднику' : 'Как рассказать студенту'}:</b> {group === 'internal' ? m.internal : m.external}</p>
            </section>
          ))}
        </div>
      ) : null}

      {section === 'scripts' ? (
        <div className="grid-2">
          {scripts.map((s) => (
            <section key={s.title} className="card">
              <div className="between"><h3 className="h3">{s.title}</h3><span className={`chip ${s.for.includes(segment) ? 'brand' : ''}`}>{s.duration}{s.for.includes(segment) ? ' · для вас' : ''}</span></div>
              <ol className="shots">{s.shots.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ol>
            </section>
          ))}
        </div>
      ) : null}

      {section === 'rules' ? (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <section className="card"><p className="label">Можно</p><ul className="ticks good">{RULES.yes.map((x) => <li key={x}><Icon name="check" size={18} /><span>{x}</span></li>)}</ul></section>
            <section className="card"><p className="label">Нельзя</p><ul className="ticks bad">{RULES.no.map((x) => <li key={x}><Icon name="no" size={18} /><span>{x}</span></li>)}</ul></section>
          </div>
          <section className="card">
            <p className="label">Перед публикацией</p>
            {RULES.checklist.map((c, i) => (
              <button key={c} type="button" className="check-row" aria-pressed={checks[i]} onClick={() => setChecks((p) => p.map((v, j) => (j === i ? !v : v)))}>
                <span className="box"><Icon name="check" size={14} /></span><span>{c}</span>
              </button>
            ))}
            <p className="fine">Это базовая памятка. Финальные правила согласуются с охраной труда и службой безопасности.</p>
          </section>
        </div>
      ) : null}

      {section === 'channels' ? (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <section className="card"><p className="label">Внутри компании</p><div className="row">{CHANNELS[group].inside.map((c) => <span key={c} className="chip brand">{c}</span>)}</div></section>
          <section className="card"><p className="label">Вовне</p><div className="row">{CHANNELS[group].outside.map((c) => <span key={c} className="chip accent">{c}</span>)}</div></section>
          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <p className="label">Общее правило</p>
            <p>Каждая публикация программы идёт с хэштегом <b>#ГолосКомпании</b>. По нему кураторы считают охват и находят лучший контент для каналов компании.</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
