import Link from 'next/link';
import { requireCurator } from '@/lib/auth';
import { db } from '@/lib/db';
import { CuratorNav } from '@/components/CuratorNav';
import { Mark, Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui';
import { logout } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';

const SCOPE_LABEL = { internal: 'куратор сотрудников', external: 'куратор студентов', all: 'куратор программы' } as const;

export default async function CuratorLayout({ children }: { children: React.ReactNode }) {
  const c = await requireCurator();
  const [counts] = await db()<{ moderation: number; applications: number; redemptions: number; initiatives: number }[]>`
    select (select count(*)::int from submissions where status = 'pending') as moderation,
           (select count(*)::int from users where role = 'ambassador' and status = 'pending') as applications,
           (select count(*)::int from redemptions where status = 'requested') as redemptions,
           (select count(*)::int from initiatives where status in ('idea', 'reporting')) as initiatives`;
  return (
    <div className="cur-shell">
      <aside className="cur-side">
        <Link href="/curator" className="brand" aria-label="Голос компании — обзор">
          <Mark />
          <span className="brand-name">Голос компании</span>
        </Link>
        <CuratorNav counts={counts} />
        <div className="cur-user">
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <Avatar name={c.name} className="sm" />
            <div className="min0">
              <p style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</p>
              <p className="fine">{SCOPE_LABEL[c.curatorScope ?? 'all']}</p>
            </div>
          </div>
          <div className="row" style={{ '--gap': '4px' } as React.CSSProperties}>
            <Link href="/curator/account" className="btn small ghost"><Icon name="lock" size={16} /> Пароль</Link>
            <form action={logout}><button type="submit" className="btn small ghost"><Icon name="logout" size={16} /> Выйти</button></form>
          </div>
        </div>
      </aside>
      <main id="main" className="cur-main">{children}</main>
    </div>
  );
}
