'use client';

import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const noDb = /DATABASE_URL|База данных не подключена/.test(error.message);
  return (
    <div className="status-page">
      <div className="status-box">
        <h1 className="h1">{noDb ? 'База данных не подключена' : 'Что-то пошло не так'}</h1>
        <p className="lead">
          {noDb
            ? 'Добавьте переменную окружения DATABASE_URL в настройках проекта на Vercel и пересоберите проект. Подробности — в README репозитория.'
            : 'Мы уже знаем об ошибке. Попробуйте обновить страницу.'}
        </p>
        {error.digest ? <p className="fine">Код ошибки: {error.digest}</p> : null}
        <div className="row"><button className="btn primary" onClick={reset}>Попробовать снова</button><Link className="btn" href="/">На главную</Link></div>
      </div>
    </div>
  );
}
