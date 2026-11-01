'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, Mark, type IconName } from './Icon';

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/me', label: 'Путь', icon: 'flag' },
  { href: '/me/tasks', label: 'Задания', icon: 'tasks' },
  { href: '/me/kit', label: 'Кит', icon: 'kit' },
  { href: '/me/rating', label: 'Рейтинг', icon: 'bars' },
  { href: '/me/rewards', label: 'Награды', icon: 'gift' },
];

function isActive(path: string, href: string) {
  return href === '/me' ? path === '/me' : path.startsWith(href);
}

export function AmbNav({ initials, unread, isCaptain, reviewCount }: { initials: string; unread: number; isCaptain: boolean; reviewCount: number }) {
  const path = usePathname();
  return (
    <>
      <header className="amb-top">
        <div className="container">
          <Link href="/me" className="brand" aria-label="Голос компании — мой путь">
            <Mark />
            <span className="brand-name">Голос компании</span>
          </Link>
          <nav className="amb-nav" aria-label="Разделы кабинета">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} aria-current={isActive(path, t.href) ? 'page' : undefined}>{t.label}</Link>
            ))}
            {isCaptain ? (
              <Link href="/me/review" aria-current={isActive(path, '/me/review') ? 'page' : undefined}>
                Проверка{reviewCount ? <span className="badge" style={{ marginLeft: 6 }}>{reviewCount}</span> : null}
              </Link>
            ) : null}
          </nav>
          <div className="right">
            {isCaptain ? (
              <Link href="/me/review" className="icon-btn amb-review-mobile" aria-label={`Проверка заданий: ${reviewCount}`}>
                <Icon name="shield" />
                {reviewCount ? <span className="dot-badge">{reviewCount}</span> : null}
              </Link>
            ) : null}
            <Link href="/me/notifications" className="icon-btn" aria-label={unread ? `Уведомления: ${unread} новых` : 'Уведомления'}>
              <Icon name="bell" />
              {unread ? <span className="dot-badge">{unread > 9 ? '9+' : unread}</span> : null}
            </Link>
            <Link href="/me/profile" className="avatar sm" aria-label="Профиль">{initials}</Link>
          </div>
        </div>
      </header>
      <nav className="amb-tabs" aria-label="Разделы">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} aria-current={isActive(path, t.href) ? 'page' : undefined}>
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
