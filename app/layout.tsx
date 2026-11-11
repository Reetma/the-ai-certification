import type { Metadata } from 'next';
import '@fontsource-variable/manrope/wght.css';
import './globals.css';
import ChatWidget from '@/components/ChatWidget';
import { setting } from '@/lib/settings';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'The AI Certification | Build your AI agent, get certified in 3 hours',
  description:
    'The AI certification for students: build an agent that does a real job for you and earn a certificate employers can check. 3 modules, about 3 hours, no code.',
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/apple-touch-icon.png' },
  appleWebApp: { title: 'The AI Certification', capable: true, statusBarStyle: 'default' },
  // Link previews (Snapchat, WhatsApp, LinkedIn…). Pages keep their own <title> and description.
  metadataBase: new URL(siteUrl()),
  openGraph: { siteName: 'The AI Certification', type: 'website', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'The AI Certification' }] },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};


export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* The assistant only appears once an Anthropic API key is configured. */}
        {(await setting('ANTHROPIC_API_KEY').catch(() => undefined)) && <ChatWidget />}
      </body>
    </html>
  );
}
