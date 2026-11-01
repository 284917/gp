'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './Icon';

export function CuratorNav({ counts }: { counts: { moderation: number; applications: number; redemptions: number } }) {
  const path = usePathname();
  const items: { href: string; label: string; icon: IconName; badge?: number }[] = [
    { href: '/curator', label: 'Обзор', icon: 'chart' },
    { href: '/curator/moderation', label: 'Модерация', icon: 'shield', badge: counts.moderation },
    { href: '/curator/applications', label: 'Заявки', icon: 'inbox', badge: counts.applications },
    { href: '/curator/ambassadors', label: 'Амбассадоры', icon: 'users' },
    { href: '/curator/tasks', label: 'Задания', icon: 'tasks' },
    { href: '/curator/rewards', label: 'Награды', icon: 'gift', badge: counts.redemptions },
    { href: '/curator/regions', label: 'Регионы', icon: 'map' },
    { href: '/curator/metrics', label: 'Метрики', icon: 'bars' },
  ];
  return (
    <nav className="cur-nav" aria-label="Разделы кабинета куратора">
      {items.map((i) => {
        const active = i.href === '/curator' ? path === '/curator' : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? 'page' : undefined}>
            <Icon name={i.icon} size={18} />
            {i.label}
            {i.badge ? <span className="badge">{i.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
