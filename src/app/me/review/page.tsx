import type { Metadata } from 'next';
import { requireAmbassador } from '@/lib/auth';
import { db } from '@/lib/db';
import { Alert, Empty, PageHead } from '@/components/ui';
import { ReviewCard, type ReviewItem } from '@/components/ReviewCard';

export const metadata: Metadata = { title: 'Проверка заданий' };

export default async function ReviewPage() {
  const u = await requireAmbassador();
  if (!u.isCaptain) {
    return (
      <>
        <PageHead title="Проверка заданий" />
        <Alert>Проверка доступна капитанам регионов. Капитаном становятся амбассадоры уровня «Лидер» по решению куратора.</Alert>
      </>
    );
  }
  const items = await db()<ReviewItem[]>`
    select s.id, a.name as user_name, a.segment, r.city, t.title, t.kind, t.points, s.body, s.link, s.file_url, s.file_name, s.flagged, s.created_at
    from submissions s join users a on a.id = s.user_id join tasks t on t.id = s.task_id left join regions r on r.id = a.region_id
    where s.status = 'pending' and not s.flagged and a.region_id = ${u.regionId} and a.id <> ${u.id}
    order by s.created_at`;
  const [done] = await db()<{ n: number }[]>`
    select count(*)::int as n from submissions where reviewer_id = ${u.id} and reviewed_at > now() - interval '30 days'`;
  return (
    <>
      <PageHead title="Проверка заданий" eyebrow={`Капитан региона · ${u.regionName}`}
        sub={`На проверке: ${items.length}. За 30 дней вы проверили ${done.n}.`} />
      <div className="stack">
        <Alert>Принимайте задание, если оно выполнено по инструкции и не нарушает памятку «можно / нельзя». Если что-то не так — верните с понятным комментарием. Съёмку на объектах и внешние публикации проверяют кураторы.</Alert>
        {items.length ? <div className="mod-list">{items.map((s) => <ReviewCard key={s.id} s={s} />)}</div>
          : <Empty icon="check" title="Всё проверено">Новые задания амбассадоров вашего региона появятся здесь.</Empty>}
      </div>
    </>
  );
}
