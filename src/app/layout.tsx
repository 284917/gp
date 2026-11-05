import type { Metadata, Viewport } from 'next';
import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/500.css';
import '@fontsource/golos-text/600.css';
import '@fontsource/golos-text/700.css';
import '@fontsource/roboto-condensed/700.css';
import './globals.css';
import './motion.css';
import { Motion } from '@/components/Motion';

const SITE_URL = process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
const DESCRIPTION = 'Сотрудники офисов, АЗС и нефтебаз вместе со студентами запускают проекты о работе в компании и передают удачные форматы в другие регионы.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Голос компании — программа амбассадоров', template: '%s · Голос компании' },
  description: DESCRIPTION,
  // карточка ссылки в Telegram, VK и мессенджерах; картинка — app/opengraph-image.jpg
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Голос компании',
    title: 'Голос компании — программа амбассадоров',
    description: DESCRIPTION,
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: 'Голос компании — программа амбассадоров', description: DESCRIPTION },
};

export const viewport: Viewport = {
  // Одна палитра для всех устройств, поэтому и цвет панели браузера один
  themeColor: '#08111e',
  colorScheme: 'dark',
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
