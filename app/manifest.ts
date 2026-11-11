import type { MetadataRoute } from 'next';

// "Add to home screen": the installed icon opens the learner's space directly.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The AI Certification',
    short_name: 'AI Certification',
    description: 'Your The AI Certification space: lessons, exam and certificate.',
    start_url: '/space',
    display: 'standalone',
    background_color: '#F6F6F3',
    theme_color: '#17274C',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
