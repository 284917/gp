'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const noDb = /DATABASE_URL|База данных не подключена/.test(error.message);
  // Страница открыта со старой версии сайта, а сайт уже обновился
  const stale = /Server Action .* was not found|failed-to-find-server-action/i.test(error.message);
  useEffect(() => {
    console.error('[ошибка страницы]', error);
  }, [error]);

  if (stale) {
    return (
      <div className="status-page">
        <div className="status-box">
          <h1 className="h1">Сайт обновился</h1>
          <p className="lead">Пока страница была открыта, вышла новая версия сайта. Обновите страницу и повторите действие.</p>
          <div className="row"><button className="btn primary" onClick={() => window.location.reload()}>Обновить страницу</button></div>
        </div>
      </div>
    );
  }

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
        <div className="row"><button className="btn primary" onClick={() => window.location.reload()}>Обновить страницу</button><button className="btn" onClick={reset}>Попробовать снова</button><Link className="btn" href="/">На главную</Link></div>
      </div>
    </div>
  );
}
