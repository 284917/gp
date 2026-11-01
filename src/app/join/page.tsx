import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Brand } from '@/components/ui';
import { Icon, Wave } from '@/components/Icon';
import { JoinForm } from '@/components/AuthForms';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Заявка в программу' };
export const dynamic = 'force-dynamic';

export default async function JoinPage() {
  const user = await getUser().catch(() => null);
  if (user) redirect(user.role === 'curator' ? '/curator' : '/me');
  const regions = await db()<{ id: string; name: string }[]>`select id, name from regions order by sort`;
  return (
    <div className="auth">
      <aside className="auth-side">
        <Brand />
        <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
          <h1 className="display">Стать голосом компании</h1>
          <ul className="ticks hide-sm" style={{ color: 'var(--on-brand)' }}>
            <li><Icon name="check" size={18} /><span>Куратор рассмотрит заявку за пару рабочих дней</span></li>
            <li><Icon name="check" size={18} /><span>После одобрения откроются задания под вашу роль и тандем</span></li>
            <li><Icon name="check" size={18} /><span>Оплаты нет: участие ради опыта, роста, признания и карьерных возможностей</span></li>
          </ul>
        </div>
        <Wave width={220} height={100} className="hide-sm" />
      </aside>
      <main className="auth-main">
        <div className="auth-box wide">
          <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
            <p className="eyebrow">Заявка в программу амбассадоров</p>
            <h2 className="h1">Расскажите о себе</h2>
          </div>
          <JoinForm regions={regions} />
        </div>
      </main>
    </div>
  );
}
