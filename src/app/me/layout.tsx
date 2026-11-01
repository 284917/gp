import { redirect } from 'next/navigation';
import { AmbNav } from '@/components/AmbNav';
import { requireMember } from '@/lib/auth';
import { db } from '@/lib/db';
import { initials } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const u = await requireMember();
  if (u.status !== 'active') redirect('/status');
  const sql = db();
  const [{ unread }] = await sql<{ unread: number }[]>`select count(*)::int as unread from notifications where user_id = ${u.id} and not read`;
  let reviewCount = 0;
  if (u.isCaptain && u.regionId) {
    const [r] = await sql<{ n: number }[]>`
      select count(*)::int as n from submissions s join users a on a.id = s.user_id
      where s.status = 'pending' and not s.flagged and a.region_id = ${u.regionId} and a.id <> ${u.id}`;
    reviewCount = r.n;
  }
  return (
    <>
      <AmbNav initials={initials(u.name)} unread={unread} isCaptain={u.isCaptain} reviewCount={reviewCount} />
      <main className="amb-main container">{children}</main>
    </>
  );
}
