import Link from 'next/link';
import { Brand, SeasonStrip } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { RegionFlow, type FlowRegion } from '@/components/RegionFlow';
import { db } from '@/lib/db';
import { INITIATIVE_POINTS, JOINT_TEMPLATES, LEVELS } from '@/lib/domain';
import { fmtNum, plural } from '@/lib/format';

export const revalidate = 300;

async function load() {
  try {
    const sql = db();
    const [[row], regions] = await Promise.all([
      sql<{ ambassadors: number; regions: number; done: number; replicas: number; demo: number }[]>`
        select (select count(*)::int from users where role = 'ambassador' and status = 'active') as ambassadors,
               (select count(*)::int from users where is_demo) as demo,
               (select count(distinct region_id)::int from users where role = 'ambassador' and status = 'active') as regions,
               (select count(*)::int from initiatives where status = 'done') as done,
               (select count(*)::int from initiatives where source_id is not null and status not in ('idea', 'declined')) as replicas`,
      sql<FlowRegion[]>`select id, city, lon, lat from regions order by sort`,
    ]);
    return { stats: row, regions };
  } catch {
    return { stats: null, regions: [] as FlowRegion[] };
  }
}

/** Иллюстрация: как форматы могут расходиться от одного города к соседним. */
const SAMPLE_FLOWS = [
  { fromId: 'nsk', toId: 'omsk' }, { fromId: 'nsk', toId: 'tomsk' }, { fromId: 'tomsk', toId: 'krsk' },
  { fromId: 'ekb', toId: 'chel' }, { fromId: 'ekb', toId: 'tmn' }, { fromId: 'spb', toId: 'yar' }, { fromId: 'msk', toId: 'nnov' },
];

const FAQ = [
  ['Сколько времени это занимает?', 'Задания недели занимают от 5 до 30 минут. Для сотрудников АЗС и нефтебаз есть форматы «с телефона за пять минут», в том числе голосовые. Инициативы — по желанию: вы сами выбираете проект и роль в команде.'],
  ['Что такое биржа инициатив?', 'Место, где амбассадоры предлагают свои проекты: интервью, экскурсии, встречи, серии публикаций. Автор описывает идею и кого ищет, куратор согласует, а сотрудники и студенты откликаются и собирают команду.'],
  ['Платят ли за участие?', 'Нет, и бонусов за участие тоже нет. Баллы за задания и проекты открывают опыт и признание: встречи с руководителями, обучение, выступление на форуме, мерч программы.'],
  ['Даёт ли программа преимущество при отборе на практику?', 'Нет: практика и стажировки проходят на общих условиях для всех. Программа помогает к ним подготовиться — карьерные консультации с HR, встречи с экспертами компании, разбор резюме и пробное собеседование.'],
  ['Можно ли снимать на АЗС и нефтебазе?', 'Только в зонах, которые согласовал руководитель объекта. Проекты на объектах согласует куратор, а в контент-ките есть памятка «можно / нельзя».'],
  ['Мне нет 18 лет, я студент колледжа. Можно?', 'Да. Для съёмок и выездов понадобится согласие родителей: куратор пришлёт форму после одобрения заявки.'],
  ['Кто проверяет работу?', 'Задания недели проверяет капитан региона. Идеи инициатив, публикации и итоги проектов смотрят кураторы программы.'],
  ['Когда набор?', 'Сезон идёт с сентября по май. Заявки принимаются круглый год, основной набор — в сентябре.'],
];

const JOURNEY: { icon: IconName; title: string; text: string }[] = [
  { icon: 'idea', title: 'Идея', text: 'Амбассадор описывает проект на один абзац: что, для кого и зачем' },
  { icon: 'users', title: 'Команда', text: 'Сотрудники и студенты откликаются, автор собирает смешанную команду' },
  { icon: 'rocket', title: 'Проект', text: 'Команда проводит встречу, снимает интервью или запускает серию постов' },
  { icon: 'library', title: 'Формат', text: 'Итоги и инструкция попадают в библиотеку проверенных форматов' },
  { icon: 'repeat', title: 'Другой регион', text: 'Команда из соседнего города повторяет формат для своей аудитории' },
];

const TAGLINE: [string, boolean][] = [
  ['Компанию', false], ['лучше', false], ['всего', false], ['описывают', false], ['те,', false], ['кто', false], ['в', false], ['ней', false],
  ['работает', true], ['и', false], ['учится.', true], ['Мы', false], ['даём', false], ['им', false], ['сцену,', false], ['команду', true], ['и', false], ['способ', false],
  ['передать', false], ['удачную', false], ['идею', false], ['дальше.', true],
];

function MockTile({ title, city, format, chip, tone, team, need }: { title: string; city: string; format: string; chip: string; tone: string; team: [string, boolean][]; need?: string[] }) {
  return (
    <div className="itile">
      <span className="itile-top">
        <span className={`t-ic f-${format}`}><Icon name={format === 'interview' ? 'video' : format === 'excursion' ? 'map' : 'repeat'} /></span>
        <span className="min0 grow"><span className="fine">{city}</span><span className="itile-title">{title}</span></span>
        <span className={`chip ${tone}`}>{tone === 'accent' ? <i className="live" /> : null}{chip}</span>
      </span>
      {need ? <span className="who-need">{need.map((n) => <span key={n} className="chip brand">{n}</span>)}</span> : null}
      <span className="itile-foot">
        <span className="team">{team.map(([t, ext], i) => <span key={t} className={`avatar sm ${ext ? 'alt' : 'soft'}`} style={{ '--i': i } as React.CSSProperties}>{t}</span>)}</span>
        <span className="fine">{team.length} в команде</span>
      </span>
    </div>
  );
}

export default async function Landing() {
  const { stats: s, regions } = await load();
  const flows = SAMPLE_FLOWS.filter((f) => regions.some((r) => r.id === f.fromId) && regions.some((r) => r.id === f.toId));
  const formats = [...JOINT_TEMPLATES.map((t) => t.title), 'Экскурсия на АЗС', 'Карьерный завтрак', 'Кадр смены', 'Голосовая история', 'Эксперт на час'];

  return (
    <>
      <header className="site-head">
        <div className="container">
          <Brand />
          <nav className="site-nav" aria-label="Разделы">
            <a href="#who">Кто такие амбассадоры</a>
            <a href="#initiatives">Инициативы</a>
            <a href="#path">Путь</a>
            <a href="#perks">Награды</a>
            <a href="#faq">Вопросы</a>
          </nav>
          <div className="row">
            <Link className="btn ghost" href="/login">Войти</Link>
            <Link className="btn primary" href="/join">Подать заявку</Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero">
          <div className="container hero-grid">
            <div className="stack" style={{ '--gap': '24px' } as React.CSSProperties}>
              <p className="eyebrow rise">Программа амбассадоров бренда работодателя</p>
              <h1 className="display"><span className="row-in">Голос</span><span className="row-in">компании</span></h1>
              <p className="lead rise" style={{ '--i': 1 } as React.CSSProperties}>
                Сотрудники офисов, АЗС и нефтебаз вместе со студентами сами придумывают проекты о работе в компании,
                собирают общие команды и передают удачные форматы в другие регионы.
              </p>
              <div className="row rise" style={{ '--gap': '12px', '--i': 2 } as React.CSSProperties}>
                <Link className="btn primary large" href="/join">Подать заявку <Icon name="arrow" size={18} /></Link>
                <Link className="btn large" href="/login">Войти в кабинет</Link>
              </div>
              {s && s.ambassadors > 0 ? (
                <div className="hero-stats rise" style={{ '--i': 3 } as React.CSSProperties}>
                  <div><b data-count={s.ambassadors}>{fmtNum(s.ambassadors)}</b><span>{plural(s.ambassadors, 'амбассадор', 'амбассадора', 'амбассадоров')}</span></div>
                  <div><b data-count={s.regions}>{fmtNum(s.regions)}</b><span>{plural(s.regions, 'регион', 'региона', 'регионов')}</span></div>
                  {s.done ? <div><b data-count={s.done}>{fmtNum(s.done)}</b><span>{plural(s.done, 'проект завершён', 'проекта завершено', 'проектов завершено')}</span></div> : null}
                </div>
              ) : null}
              {s && s.demo > 0 ? (
                <p className="fine rise demo-flag" style={{ '--i': 4 } as React.CSSProperties}>
                  <Icon name="info" size={14} /> Цифры и участники на сайте — модельные данные прототипа для кейса, а не результаты компании.
                </p>
              ) : null}
            </div>
            <div className="stack-demo rise" style={{ '--i': 2 } as React.CSSProperties} aria-hidden="true">
              <MockTile title="Голос профессии: первый год на АЗС" city="Видеоинтервью · Новосибирск" format="interview" chip="Набор команды" tone="accent" team={[['МК', false], ['ДС', true]]} need={['Студент колледжа', 'АЗС и нефтебаза']} />
              <MockTile title="Экскурсия на нефтебазу для колледжа" city="Экскурсия · Омск" format="excursion" chip="В работе" tone="brand" team={[['ИП', false], ['АВ', true], ['ЕЛ', true]]} />
              <MockTile title="Один вопрос, три взгляда" city="Региональный вызов · Томск" format="challenge" chip="Завершена" tone="good" team={[['ОН', false], ['РТ', false], ['КЗ', true], ['ЮМ', true]]} />
              <span className="chip good demo-note"><Icon name="repeat" size={13} /> Формат повторили в Омске</span>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...formats, ...formats].map((f, i) => <span key={i}><Icon name="sparkle" size={20} />{f}</span>)}
          </div>
        </div>

        <section className="section alt" id="who">
          <div className="container">
            <div className="section-head" data-reveal>
              <p className="eyebrow">Кто такие амбассадоры</p>
              <h2 className="h1">Две команды, одна история</h2>
              <p className="lead">Сотрудники показывают работу изнутри, студенты рассказывают о компании сверстникам. Самое сильное получается, когда они делают проект вместе.</p>
            </div>
            <div className="who">
              <article className="card" data-reveal>
                <div className="between"><h3 className="h2">Сотрудники</h3><span className="chip brand">внутренние амбассадоры</span></div>
                <div className="who-tags"><span className="chip">Офисы</span><span className="chip">АЗС</span><span className="chip">Нефтебазы</span></div>
                <ul className="ticks good">
                  <li><Icon name="check" size={18} /><span>Делятся историями о работе в каналах компании и на карьерных площадках</span></li>
                  <li><Icon name="check" size={18} /><span>Выступают экспертами на днях карьеры и встречах со студентами</span></li>
                  <li><Icon name="check" size={18} /><span>Запускают свои инициативы и становятся героями студенческих интервью</span></li>
                </ul>
              </article>
              <article className="card" data-reveal style={{ '--i': 1 } as React.CSSProperties}>
                <div className="between"><h3 className="h2">Студенты</h3><span className="chip accent">внешние амбассадоры</span></div>
                <div className="who-tags"><span className="chip">Вузы</span><span className="chip">Колледжи</span></div>
                <ul className="ticks good">
                  <li><Icon name="check" size={18} /><span>Организуют встречи, экскурсии на объекты и в офисы</span></li>
                  <li><Icon name="check" size={18} /><span>Снимают и монтируют ролики с сотрудниками, ведут стенды на ярмарках</span></li>
                  <li><Icon name="check" size={18} /><span>Предлагают проекты для своих вузов и колледжей и собирают под них команды</span></li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="initiatives">
          <div className="container stack" style={{ '--gap': '48px' } as React.CSSProperties}>
            <div className="section-head" style={{ marginBottom: 0 }} data-reveal>
              <p className="eyebrow">Биржа инициатив</p>
              <h2 className="h1">От идеи одного человека<br />до формата для всей страны</h2>
              <p className="lead">Проекты придумывают сами амбассадоры. Куратор помогает и согласует, а удачный формат не теряется: его подхватывает следующий регион.</p>
            </div>
            <ol className="journey">
              {JOURNEY.map((j, i) => (
                <li key={j.title} data-reveal style={{ '--i': i } as React.CSSProperties}>
                  <span className="j-ic"><Icon name={j.icon} size={24} /></span>
                  <div><h3>{j.title}</h3><p>{j.text}</p></div>
                </li>
              ))}
            </ol>
            <ul className="points-strip" data-reveal>
              <li><b>+{INITIATIVE_POINTS.author}</b><span>автору завершённого проекта</span></li>
              <li><b>+{INITIATIVE_POINTS.member}</b><span>каждому в команде</span></li>
              <li><b>+{INITIATIVE_POINTS.mixed}</b><span>если в команде сотрудники и студенты</span></li>
              <li><b>+{INITIATIVE_POINTS.replicated}</b><span>автору, когда формат повторили</span></li>
            </ul>
          </div>
        </section>

        <section className="tagline">
          <div className="container">
            <p className="words" aria-label={TAGLINE.map(([w]) => w).join(' ')}>
              {TAGLINE.map(([w, acc], i) => <span key={i} className={acc ? 'acc' : ''} aria-hidden="true">{w}{' '}</span>)}
            </p>
          </div>
        </section>

        {regions.length ? (
          <section className="section" style={{ paddingTop: 0 }}>
            <div className="container">
              <div className="landing-flow" data-reveal>
                <div className="grid-2" style={{ alignItems: 'end' }}>
                  <div className="stack">
                    <p className="eyebrow on-dark">Регионы</p>
                    <h2 className="h1">Кураторы в Петербурге,<br />проекты по всей стране</h2>
                  </div>
                  <p className="lead">Четыре куратора не могут придумать проект для каждого города. Поэтому идеи рождаются в регионах, а библиотека форматов переносит лучшие из них дальше.</p>
                </div>
                <div className="chart-wrap">
                  <RegionFlow regions={regions} flows={flows} label="Пример: формат из одного города повторяют в соседних регионах" />
                </div>
                <p className="fine" style={{ color: 'var(--on-deep-muted)' }}>Схема показывает принцип: формат из одного города повторяют в соседних регионах программы.</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="section alt" id="path">
          <div className="container stack" style={{ '--gap': '32px' } as React.CSSProperties}>
            <div className="section-head" style={{ marginBottom: 0 }} data-reveal>
              <p className="eyebrow">Путь амбассадора</p>
              <h2 className="h1">Четыре уровня за сезон</h2>
              <p className="lead">Уровень растёт от баллов за задания и проекты. Для двух старших нужен ещё и вклад в инициативы: эксперт участвует в проекте, лидер доводит до результата свой.</p>
            </div>
            <div className="levels" data-reveal>
              {LEVELS.map((l) => (
                <div key={l.n}>
                  <span className="lv-n">{l.n}</span>
                  <span className="lv-name">{l.name}</span>
                  <span className="fine">{l.min ? `от ${fmtNum(l.min)} баллов` : 'с первого дня'}</span>
                  {l.needText ? <span className="lv-need"><Icon name="rocket" size={14} /> и {l.needText}</span> : null}
                  <ul className="ticks">
                    {l.unlocks.map((u) => <li key={u}><Icon name="check" size={16} /><span style={{ fontSize: 14 }}>{u}</span></li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 24 }} data-reveal>
              <div className="between"><h3 className="h3">Сезон: сентябрь — май</h3><span className="fine">у каждого месяца своя тема</span></div>
              <SeasonStrip />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head" data-reveal>
              <p className="eyebrow">Как это работает</p>
              <h2 className="h1">От заявки до своего проекта</h2>
            </div>
            <ol className="how">
              <li data-reveal><h3>Заявка</h3><p className="sub">Расскажите о себе и выберите роль: офис, объект, вуз или колледж. Куратор ответит за пару дней.</p></li>
              <li data-reveal style={{ '--i': 1 } as React.CSSProperties}><h3>Задания недели</h3><p className="sub">Короткие посты, фото, голосовые. Капитан региона проверяет и начисляет баллы.</p></li>
              <li data-reveal style={{ '--i': 2 } as React.CSSProperties}><h3>Своя инициатива</h3><p className="sub">Предложите проект или присоединитесь к чужому. Команду из сотрудников и студентов собирает автор.</p></li>
              <li data-reveal style={{ '--i': 3 } as React.CSSProperties}><h3>Признание</h3><p className="sub">Уровни, библиотека форматов с вашим именем и форум амбассадоров в апреле.</p></li>
            </ol>
          </div>
        </section>

        <section className="section alt" id="perks">
          <div className="container">
            <div className="section-head" data-reveal>
              <p className="eyebrow">Что вы получаете</p>
              <h2 className="h1">Баллы меняются на опыт</h2>
              <p className="lead">Оплаты и бонусов за участие нет. Зато есть то, что сложно получить иначе.</p>
            </div>
            <div className="perks">
              <article className="card" data-reveal><Icon name="trophy" size={26} /><h3 className="h3">Признание</h3><ul><li>Авторство формата в библиотеке</li><li>Выступление на форуме амбассадоров</li><li>Кубок регионов</li></ul></article>
              <article className="card" data-reveal style={{ '--i': 1 } as React.CSSProperties}><Icon name="bolt" size={26} /><h3 className="h3">Развитие</h3><ul><li>Сторителлинг и выступления</li><li>Управление проектом и командой</li><li>Разбор проекта с экспертом</li></ul></article>
              <article className="card" data-reveal style={{ '--i': 2 } as React.CSSProperties}><Icon name="star" size={26} /><h3 className="h3">Карьера</h3><ul><li>Карьерные консультации с HR</li><li>Встречи с экспертами компании</li><li>Помощь в подготовке к отбору на практику</li></ul></article>
              <article className="card" data-reveal style={{ '--i': 3 } as React.CSSProperties}><Icon name="gift" size={26} /><h3 className="h3">Сообщество</h3><ul><li>Команды из разных городов</li><li>Встречи с руководителями</li><li>Мерч программы</li></ul></article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container grid-2" style={{ alignItems: 'center', gap: 32 }}>
            <div className="stack" data-reveal>
              <p className="eyebrow">Для кураторов</p>
              <h2 className="h1">Четыре куратора на всю страну</h2>
              <p className="lead">Проверку заданий берут капитаны регионов, проекты ведут сами авторы. Кураторы согласуют идеи и видят, растёт ли сообщество.</p>
            </div>
            <ul className="ticks good" style={{ fontSize: 15 }} data-reveal>
              <li><Icon name="check" size={18} /><span>Индекс инициативности: кто довёл свой проект до конца</span></li>
              <li><Icon name="check" size={18} /><span>Доля смешанных команд из сотрудников и студентов</span></li>
              <li><Icon name="check" size={18} /><span>Повторы форматов между регионами и удержание участников</span></li>
              <li><Icon name="check" size={18} /><span>Заявки, модерация, охват и наймы в одном кабинете</span></li>
            </ul>
          </div>
        </section>

        <section className="section alt" id="faq">
          <div className="container">
            <div className="section-head" data-reveal>
              <p className="eyebrow">Вопросы</p>
              <h2 className="h1">Коротко о важном</h2>
            </div>
            <div className="faq">
              {FAQ.map(([q, a], i) => (
                <details key={i} data-reveal style={{ '--i': i % 4 } as React.CSSProperties}><summary>{q}</summary><p>{a}</p></details>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="cta-band" data-reveal>
              <h2 className="h1">Ваша история — лучший аргумент для будущих коллег</h2>
              <Link className="btn large" href="/join">Подать заявку <Icon name="arrow" size={18} /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <div className="container">
          <span>© {new Date().getFullYear()} Голос компании</span>
          <span>Проект команды для кейса Intelligence CUP. Не является официальным сайтом компании.</span>
        </div>
      </footer>
    </>
  );
}
