'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';

/** Переключатель «Биржа / Библиотека»: подложка переезжает к активному пункту. */
export function HubTabs() {
  const path = usePathname();
  const lib = path.startsWith('/me/formats');
  return (
    <nav className={`seg-switch ${lib ? 'at-1' : 'at-0'}`} aria-label="Инициативы">
      <span className="seg-thumb" aria-hidden="true" />
      <Link href="/me/initiatives" aria-current={!lib ? 'page' : undefined}><Icon name="rocket" size={17} /> Биржа инициатив</Link>
      <Link href="/me/formats" aria-current={lib ? 'page' : undefined}><Icon name="library" size={17} /> Библиотека форматов</Link>
    </nav>
  );
}
