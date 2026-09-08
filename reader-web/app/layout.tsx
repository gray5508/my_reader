import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '静读 · 本地伴读阅读器',
  description: '为逐章伴读和中文语境译文设计的本地护眼阅读器。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
