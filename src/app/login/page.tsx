import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Brand } from '@/components/ui';
import { Wave } from '@/components/Icon';
import { LoginForm } from '@/components/AuthForms';
import { demoLogin } from '@/app/actions/auth';
import { getUser, isDemoMode } from '@/lib/auth';

export const metadata: Metadata = { title: 'Вход' };

const DEMO = [
  { who: 'curator', title: 'Куратор', sub: 'Анна Власова, Санкт-Петербург' },
  { who: 'ambassador', title: 'Амбассадор', sub: 'Алина, оператор АЗС, Омск' },
  { who: 'captain', title: 'Капитан региона', sub: 'Олег, менеджер АЗС, Омск' },
  { who: 'student', title: 'Студент колледжа', sub: 'Даниил, тандем с Алиной' },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; demo?: string }> }) {
  const sp = await searchParams;
  const user = await getUser().catch(() => null);
  if (user) redirect(user.role === 'curator' ? '/curator' : '/me');
  return (
    <div className="auth">
      <aside className="auth-side">
        <Brand />
        <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
          <h1 className="display">С возвращением</h1>
          <p className="lead hide-sm">Задания недели, баллы и награды, проверка работ и метрики программы — в одном кабинете.</p>
        </div>
        <Wave width={220} height={100} className="hide-sm" />
      </aside>
      <main className="auth-main">
        <div className="auth-box">
          <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
            <p className="eyebrow">Вход в кабинет</p>
            <h2 className="h1">Войти</h2>
          </div>
          <LoginForm next={sp.next} />
          {isDemoMode() ? (
            <div className="demo-box">
              <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                <p className="label">Демо-доступ</p>
                <p className="fine">Войдите в готовый кабинет одним нажатием. Данные демонстрационные.</p>
              </div>
              {sp.demo === 'missing' ? <p className="fine">Демо-данные ещё не созданы: пересоберите проект с подключённой базой.</p> : null}
              <form action={demoLogin} className="demo-grid">
                {DEMO.map((d) => (
                  <button key={d.who} type="submit" name="who" value={d.who} className="btn">
                    <span className="stack" style={{ '--gap': '1px' } as React.CSSProperties}>
                      <b>{d.title}</b>
                      <span className="fine">{d.sub}</span>
                    </span>
                  </button>
                ))}
              </form>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
