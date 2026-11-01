'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const noDb = /DATABASE_URL|База данных не подключена/.test(error.message);
  useEffect(() => {
    console.error('[ошибка страницы]', error);
  }, [error]);
  return (
    <div className="status-page">
      <div className="status-box">
        <h1 className="h1">{noDb ? 'База данных не подключена' : 'Что-то пошло не так'}</h1>
        <p className="lead">
          {noDb
            ? 'Добавьте переменную окружения DATABASE_URL в настройках проекта на Vercel и пересоберите проект. Подробности — в README репозитория.'
            : 'Попробуйте обновить страницу. Если ошибка повторяется, пришлите текст ниже разработчикам.'}
        </p>
        <pre className="kit-out fine" style={{ maxHeight: 200, overflow: 'auto' }}>
          {[error.message, error.digest ? `Код ошибки: ${error.digest}` : '', typeof window !== 'undefined' ? `Страница: ${window.location.pathname}` : '']
            .filter(Boolean)
            .join('\n')}
        </pre>
        <div className="row"><button className="btn primary" onClick={reset}>Попробовать снова</button><Link className="btn" href="/">На главную</Link></div>
      </div>
    </div>
  );
}
