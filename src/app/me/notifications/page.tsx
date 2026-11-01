import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAmbassador } from '@/lib/auth';
import { db } from '@/lib/db';
import { fmtDateTime } from '@/lib/format';
import { Empty, PageHead } from '@/components/ui';
import { MarkRead } from '@/components/MarkRead';

export const metadata: Metadata = { title: 'Уведомления' };

export default async function NotificationsPage() {
  const u = await requireAmbassador();
  const notes = await db()<{ id: number; text: string; href: string | null; read: boolean; createdAt: Date }[]>`
    select id, text, href, read, created_at from notifications where user_id = ${u.id} order by created_at desc limit 60`;
  const unread = notes.filter((n) => !n.read).length;
  return (
    <>
      <PageHead title="Уведомления" sub={unread ? `Новых: ${unread}` : 'Все прочитаны'} />
      <MarkRead unread={unread} />
      {notes.length ? (
        <section className="card" style={{ maxWidth: 760 }}>
          <ul className="list">
            {notes.map((n) => (
              <li key={n.id}>
                <Link href={n.href ?? '/me'} className="notif">
                  <span className={`dot ${n.read ? 'read' : ''}`} />
                  <span className="min0"><span>{n.text}</span><br /><span className="fine">{fmtDateTime(n.createdAt)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : <Empty icon="bell" title="Уведомлений пока нет">Здесь появятся результаты проверки заданий и новости программы.</Empty>}
    </>
  );
}
