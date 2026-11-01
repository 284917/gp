import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Brand, Alert } from '@/components/ui';
import { requireMember } from '@/lib/auth';
import { logout } from '@/app/actions/auth';
import { SEGMENTS } from '@/lib/domain';
import { fmtDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Статус заявки' };

export default async function StatusPage() {
  const u = await requireMember();
  if (u.status === 'active') redirect('/me');
  return (
    <div className="status-page">
      <div className="status-box">
        <Brand />
        {u.status === 'pending' ? (
          <div className="card" style={{ padding: 24, gap: 16 }}>
            <p className="eyebrow">Заявка от {fmtDate(u.createdAt)}</p>
            <h1 className="h1">Заявка на рассмотрении</h1>
            <p>Спасибо, {u.name.split(' ')[0]}! Куратор программы посмотрит заявку в течение пары рабочих дней. Когда её одобрят, здесь откроется ваш кабинет: задания, тандем и награды.</p>
            <ul className="list">
              <li className="between"><span className="sub">Роль</span><span>{u.segment ? SEGMENTS[u.segment].long : '—'}</span></li>
              <li className="between"><span className="sub">Регион</span><span>{u.regionName ?? '—'}</span></li>
              <li className="between"><span className="sub">Место работы или учёбы</span><span>{u.org ?? '—'}</span></li>
            </ul>
            <Alert>Пока ждёте, подумайте, о какой истории с работы или учёбы вы рассказали бы первой.</Alert>
          </div>
        ) : u.status === 'paused' ? (
          <div className="card" style={{ padding: 24, gap: 16 }}>
            <h1 className="h1">Участие на паузе</h1>
            <p>Куратор поставил ваше участие на паузу. Баллы и уровень сохранены. Чтобы вернуться, напишите куратору программы.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 24, gap: 16 }}>
            <h1 className="h1">Заявка не одобрена</h1>
            <p>Сейчас мы не можем принять вас в программу. Набор открывается каждый сентябрь — будем рады новой заявке.</p>
          </div>
        )}
        <form action={logout}><button className="btn" type="submit">Выйти</button></form>
      </div>
    </div>
  );
}
