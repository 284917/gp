import Link from 'next/link';
import { Brand, LevelCard, SeasonStrip, KindIcon } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { db } from '@/lib/db';
import { LEVELS } from '@/lib/domain';
import { fmtNum, plural } from '@/lib/format';

export const revalidate = 300;

async function stats() {
  try {
    const [row] = await db()<{ ambassadors: number; regions: number; stories: number }[]>`
      select (select count(*)::int from users where role = 'ambassador' and status = 'active') as ambassadors,
             (select count(distinct region_id)::int from users where role = 'ambassador' and status = 'active') as regions,
             (select count(*)::int from submissions where status = 'approved') as stories`;
    return row;
  } catch {
    return null;
  }
}

const FAQ = [
  ['Сколько времени это занимает?', 'Большинство заданий — от 5 до 30 минут в неделю. Для сотрудников АЗС и нефтебаз есть форматы «с телефона за пять минут», в том числе голосовые. Мероприятия — по желанию.'],
  ['Платят ли за участие?', 'Нет. Баллы за задания обмениваются на опыт и признание: встречи с руководителями, обучение, фотосессию, мерч, а студентам — приоритет при отборе на практику и стажировку.'],
  ['Можно ли снимать на АЗС и нефтебазе?', 'Только в зонах, которые согласовал руководитель объекта. В контент-ките есть памятка «можно / нельзя», а задания со съёмкой на объектах дополнительно проверяет куратор.'],
  ['Мне нет 18 лет, я студент колледжа. Можно?', 'Да. Для съёмок и выездов понадобится согласие родителей — куратор пришлёт форму после одобрения заявки.'],
  ['Кто проверяет задания?', 'Капитан вашего региона — опытный амбассадор уровня «Лидер». Спорные случаи, съёмку на объектах и внешние публикации смотрят кураторы программы.'],
  ['Когда набор?', 'Сезон идёт с сентября по май. Заявки принимаются круглый год, основной набор — в сентябре.'],
];

export default async function Landing() {
  const s = await stats();
  return (
    <>
      <header className="site-head">
        <div className="container">
          <Brand />
          <nav className="site-nav" aria-label="Разделы">
            <a href="#who">Кто такие амбассадоры</a>
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

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="stack" style={{ '--gap': '22px' } as React.CSSProperties}>
              <p className="eyebrow">Программа амбассадоров бренда работодателя</p>
              <h1 className="display">Голос<br />компании</h1>
              <p className="lead">
                Сотрудники офисов, АЗС и нефтебаз вместе со студентами вузов и колледжей рассказывают, как на самом деле устроена работа в компании.
                Короткие задания, рост по уровням и награды, которые не купишь.
              </p>
              <div className="row" style={{ '--gap': '12px' } as React.CSSProperties}>
                <Link className="btn primary large" href="/join">Подать заявку <Icon name="arrow" size={18} /></Link>
                <Link className="btn large" href="/login">Войти в кабинет</Link>
              </div>
              {s && s.ambassadors > 0 ? (
                <div className="hero-stats">
                  <div><b>{fmtNum(s.ambassadors)}</b><span>{plural(s.ambassadors, 'амбассадор', 'амбассадора', 'амбассадоров')}</span></div>
                  <div><b>{fmtNum(s.regions)}</b><span>{plural(s.regions, 'регион', 'региона', 'регионов')}</span></div>
                  <div><b>{fmtNum(s.stories)}</b><span>{plural(s.stories, 'история принята', 'истории приняты', 'историй принято')}</span></div>
                </div>
              ) : null}
            </div>
            <div className="hero-visual" aria-hidden="true">
              <span className="chip good float"><Icon name="check" size={13} /> Принято капитаном · +60</span>
              <div className="tilt"><LevelCard points={480} compact /></div>
              <div className="task" style={{ boxShadow: 'var(--shadow-s)' }}>
                <KindIcon kind="photo" />
                <span className="task-body">
                  <span className="task-title">Кадр смены</span>
                  <span className="meta"><Icon name="clock" size={14} /> 5 мин · Фото</span>
                </span>
                <span className="pts">+40</span>
              </div>
              <div className="task" style={{ boxShadow: 'var(--shadow-s)' }}>
                <KindIcon kind="event" />
                <span className="task-body">
                  <span className="task-title">Экскурсия на АЗС</span>
                  <span className="meta"><Icon name="tandem" size={14} /> с тандемом · Встреча</span>
                </span>
                <span className="pts">+120</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section alt" id="who">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Кто такие амбассадоры</p>
              <h2 className="h1">Две команды, одна история</h2>
              <p className="lead">Сотрудники показывают работу изнутри, студенты рассказывают о компании сверстникам. Вместе они работают в тандемах.</p>
            </div>
            <div className="who">
              <article className="card">
                <div className="between"><h3 className="h2">Сотрудники</h3><span className="chip brand">внутренние амбассадоры</span></div>
                <div className="who-tags"><span className="chip">Офисы</span><span className="chip">АЗС</span><span className="chip">Нефтебазы</span></div>
                <ul className="ticks good">
                  <li><Icon name="check" size={18} /><span>Делятся историями о работе в каналах компании и на карьерных площадках</span></li>
                  <li><Icon name="check" size={18} /><span>Выступают экспертами на днях карьеры и встречах со студентами</span></li>
                  <li><Icon name="check" size={18} /><span>Продвигают реферальную программу и становятся наставниками студентов</span></li>
                </ul>
              </article>
              <article className="card">
                <div className="between"><h3 className="h2">Студенты</h3><span className="chip accent">внешние амбассадоры</span></div>
                <div className="who-tags"><span className="chip">Вузы</span><span className="chip">Колледжи</span></div>
                <ul className="ticks good">
                  <li><Icon name="check" size={18} /><span>Организуют встречи, экскурсии на объекты и в офисы</span></li>
                  <li><Icon name="check" size={18} /><span>Дежурят на ярмарках вакансий и ведут стенды о практике</span></li>
                  <li><Icon name="check" size={18} /><span>Снимают короткие видео и рассказывают о стажировках однокурсникам</span></li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="path">
          <div className="container stack" style={{ '--gap': '28px' } as React.CSSProperties}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <p className="eyebrow">Путь амбассадора</p>
              <h2 className="h1">Четыре уровня за сезон</h2>
              <p className="lead">Баллы за принятые задания поднимают уровень. Каждый уровень открывает новые возможности, а лидеры становятся капитанами регионов.</p>
            </div>
            <div className="levels">
              {LEVELS.map((l) => (
                <div key={l.n}>
                  <span className="lv-n">{l.n}</span>
                  <span className="lv-name">{l.name}</span>
                  <span className="fine">{l.min ? `от ${fmtNum(l.min)} баллов` : 'с первого дня'}</span>
                  <ul className="ticks">
                    {l.unlocks.map((u) => <li key={u}><Icon name="check" size={16} /><span style={{ fontSize: 14 }}>{u}</span></li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 22 }}>
              <div className="between"><h3 className="h3">Сезон: сентябрь — май</h3><span className="fine">у каждого месяца своя тема</span></div>
              <SeasonStrip />
            </div>
          </div>
        </section>

        <section className="section alt">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Как это работает</p>
              <h2 className="h1">От заявки до признания</h2>
            </div>
            <ol className="how">
              <li><h3>Заявка</h3><p className="sub">Расскажите о себе и выберите роль: офис, объект, вуз или колледж. Куратор ответит за пару дней.</p></li>
              <li><h3>Старт и тандем</h3><p className="sub">Получите контент-кит, капитана региона и пару: сотрудник становится наставником студента.</p></li>
              <li><h3>Задания недели</h3><p className="sub">Посты, фото, голосовые, встречи. Сдаёте в кабинете, капитан проверяет и начисляет баллы.</p></li>
              <li><h3>Признание</h3><p className="sub">Уровни, кубок регионов и награды. Финал сезона — форум амбассадоров в апреле.</p></li>
            </ol>
          </div>
        </section>

        <section className="section" id="perks">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Что вы получаете</p>
              <h2 className="h1">Баллы меняются на опыт</h2>
              <p className="lead">Оплаты за участие нет. Зато есть то, что сложно получить иначе.</p>
            </div>
            <div className="perks">
              <article className="card"><Icon name="trophy" size={26} /><h3 className="h3">Признание</h3><ul><li>Завтрак с директором</li><li>Форум амбассадоров</li><li>Кубок регионов</li></ul></article>
              <article className="card"><Icon name="bolt" size={26} /><h3 className="h3">Развитие</h3><ul><li>Сторителлинг и выступления</li><li>Работа с контентом</li><li>Фотосессия для личного бренда</li></ul></article>
              <article className="card"><Icon name="star" size={26} /><h3 className="h3">Карьера</h3><ul><li>Приоритет на практику</li><li>Рекомендательное письмо</li><li>Запись в карьерном профиле</li></ul></article>
              <article className="card"><Icon name="gift" size={26} /><h3 className="h3">Мерч и бонусы</h3><ul><li>Худи и значки программы</li><li>Бонусы на АЗС</li><li>Подарки к итогам сезона</li></ul></article>
            </div>
          </div>
        </section>

        <section className="section alt">
          <div className="container grid-2" style={{ alignItems: 'center', gap: 32 }}>
            <div className="stack">
              <p className="eyebrow">Для кураторов</p>
              <h2 className="h1">Четыре куратора на всю страну</h2>
              <p className="lead">Рутину берут на себя капитаны регионов, а кураторы видят всю программу на одном экране.</p>
            </div>
            <ul className="ticks good" style={{ fontSize: 15 }}>
              <li><Icon name="check" size={18} /><span>Заявки, модерация и выдача наград в одной очереди</span></li>
              <li><Icon name="check" size={18} /><span>Метрики: вовлечённость, охват, кандидаты и наймы</span></li>
              <li><Icon name="check" size={18} /><span>Карта регионов с часовыми поясами и капитанами</span></li>
              <li><Icon name="check" size={18} /><span>Задания недели публикуются для нужной аудитории за минуту</span></li>
            </ul>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Вопросы</p>
              <h2 className="h1">Коротко о важном</h2>
            </div>
            <div className="faq">
              {FAQ.map(([q, a]) => (
                <details key={q}><summary>{q}</summary><p>{a}</p></details>
              ))}
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-band">
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
