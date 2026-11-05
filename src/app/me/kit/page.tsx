import type { Metadata } from 'next';
import { requireAmbassador } from '@/lib/auth';
import { seasonInfo } from '@/lib/domain';
import { PageHead } from '@/components/ui';
import { KitView } from '@/components/KitView';

export const metadata: Metadata = { title: 'Контент-кит' };

export default async function KitPage() {
  const u = await requireAmbassador();
  return (
    <>
      <PageHead title="Контент-кит" eyebrow="Инструменты амбассадора" sub="Всё, чтобы рассказать о работе быстро и без ошибок." />
      <KitView segment={u.segment ?? 'office'} userId={u.id} careerUrl={process.env.CAREER_URL || 'https://career.gazprom-neft.ru/'} season={seasonInfo().label} />
    </>
  );
}
