import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Brand } from '@/components/ui';
import { Wave } from '@/components/Icon';
import { LoginForm } from '@/components/AuthForms';
import { getUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Вход' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
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
          <p className="fine">Забыли пароль? Напишите куратору программы — он поможет восстановить доступ.</p>
        </div>
      </main>
    </div>
  );
}
