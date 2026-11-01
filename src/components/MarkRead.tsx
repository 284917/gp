'use client';

import { useEffect, useRef } from 'react';
import { markNotificationsRead } from '@/app/actions/me';

/** Отмечает уведомления прочитанными после того, как страница показана. */
export function MarkRead({ unread }: { unread: number }) {
  const done = useRef(false);
  useEffect(() => {
    if (!unread || done.current) return;
    done.current = true;
    const t = setTimeout(() => { void markNotificationsRead(); }, 1200);
    return () => clearTimeout(t);
  }, [unread]);
  return null;
}
