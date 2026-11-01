import Link from 'next/link';
import { Brand } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="status-page">
      <div className="status-box">
        <Brand />
        <h1 className="display" style={{ color: 'var(--brand-ink)' }}>404</h1>
        <p className="lead">Такой страницы нет. Возможно, задание убрали в архив или ссылка устарела.</p>
        <div className="row"><Link className="btn primary" href="/">На главную</Link><Link className="btn" href="/me">В кабинет</Link></div>
      </div>
    </div>
  );
}
