import type { Metadata } from 'next';
import { requireCurator } from '@/lib/auth';
import { PageHead } from '@/components/ui';
import { PasswordForm } from '@/components/ProfileForms';

export const metadata: Metadata = { title: 'Мой аккаунт' };

export default async function CuratorAccount() {
  const c = await requireCurator();
  return (
    <div className="stack" style={{ '--gap': '18px', maxWidth: 720 } as React.CSSProperties}>
      <PageHead title="Мой аккаунт" eyebrow="Кабинет куратора" sub={`${c.name} · ${c.email}`} />
      <section className="card">
        <p className="label">Смена пароля</p>
        <PasswordForm />
      </section>
    </div>
  );
}
