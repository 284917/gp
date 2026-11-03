import type { Metadata, Viewport } from 'next';
import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/500.css';
import '@fontsource/golos-text/600.css';
import '@fontsource/golos-text/700.css';
import '@fontsource/roboto-condensed/700.css';
import './globals.css';
import './motion.css';
import { Motion } from '@/components/Motion';

export const metadata: Metadata = {
  title: { default: 'Голос компании — программа амбассадоров', template: '%s · Голос компании' },
  description: 'Сотрудники и студенты рассказывают о работе в компании, растут по уровням и получают признание.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ecf1f7' },
    { media: '(prefers-color-scheme: dark)', color: '#08111e' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <a className="skip" href="#main">К содержанию</a>
        {children}
        <Motion />
      </body>
    </html>
  );
}
