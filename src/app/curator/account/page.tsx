import type { Metadata } from 'next';
import { requireCurator } from '@/lib/auth';
import { Alert, PageHead } from '@/components/ui';
import { PasswordForm } from '@/components/ProfileForms';

export const metadata: Metadata = { title: 'Мой аккаунт' };

export default async function CuratorAccount() {
  const c = await requireCurator();
  const isEnvAdmin = (process.env.ADMIN_EMAIL || '').trim().toLowerCase() === c.email;
  return (
    <div className="stack" style={{ '--gap': '18px', maxWidth: 720 } as React.CSSProperties}>
      <PageHead title="Мой аккаунт" eyebrow="Кабинет куратора" sub={`${c.name} · ${c.email}`} />
      <section className="card">
        <p className="label">Смена пароля</p>
        {isEnvAdmin ? (
          <Alert>
            Это главный аккаунт куратора: его пароль задаётся переменной ADMIN_PASSWORD в настройках проекта на Vercel.
            Чтобы сменить пароль, поменяйте значение переменной и пересоберите проект (Deployments → Redeploy).
          </Alert>
        ) : <PasswordForm />}
      </section>
    </div>
  );
}
