import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { assetUrl, siteOrigin } from '@/lib/urls';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
