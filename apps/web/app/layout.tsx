import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Only1AI', description: 'Find the opportunity. You make the decision.' };

export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#060a14' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
