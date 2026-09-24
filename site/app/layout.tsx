/* oxlint-disable next/no-page-custom-font -- This root layout applies to every App Router page. */
import type { Metadata } from 'next';
import './globals.css';
import { assetUrl, siteOrigin } from '@/lib/urls';

export const metadata: Metadata = {
  title: '节期 · Jieqi — 节日与节气卡片',
  description:
    '二十四节气与中国节日，化作一张张如期而至的卡片。浏览邮票插画，为你的网站添一份过节的仪式感。',
  icons: { icon: assetUrl('/favicon.svg') },
  ...(siteOrigin ? { metadataBase: new URL(siteOrigin), alternates: { canonical: '/' } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap"
        />
      </head>
      <body className="antialiased">
        {children}
        <script
          defer
          src="https://tongji.giantaccel.com/script.js"
          data-website-id="3e08cbb7-51eb-44ab-97e0-8deba80dd1f4"
        />
      </body>
    </html>
  );
}
